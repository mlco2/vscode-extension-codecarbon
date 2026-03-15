"""
Script to start and stop the CodeCarbon emissions tracker.
"""
import sys
import time
import signal
import json
from codecarbon import EmissionsTracker
from metrics_utils import to_number


# Redirect stderr to stdout
sys.stderr = sys.stdout

# Force single-run mode to prevent parallel trackers writing to the same outputs.
tracker = EmissionsTracker(allow_multiple_runs=False)
running = True  # Global variable to control the loop
DEFAULT_UPDATE_INTERVAL = 5.0


def get_measure_power_secs():
    """Get tracker measurement interval, honoring CodeCarbon configuration."""
    value = getattr(tracker, "measure_power_secs", None)
    if value is None:
        value = getattr(tracker, "_measure_power_secs", None)

    try:
        seconds = float(value)
        if seconds > 0:
            return seconds
    except (TypeError, ValueError):
        pass
    return DEFAULT_UPDATE_INTERVAL

def start():
    """
    Start the tracker and run continuously until a termination signal is received.
    """
    update_interval = get_measure_power_secs()
    print("Tracker started.")
    print(f"Will emit metrics every {update_interval} seconds")
    tracker.start()
    if getattr(tracker, "_another_instance_already_running", False) or not hasattr(tracker, "_start_time"):
        print("Tracker did not start because another CodeCarbon instance is active.")
        sys.exit(1)

    try:
        # Emit metrics at the same cadence as codecarbon measurement interval.
        while running:
            time.sleep(update_interval)
            if running:
                emit_metrics(update_interval)
    finally:
        stop()

def emit_metrics(update_interval):
    """
    Emit current metrics from the tracker in JSON format.
    """
    try:
        # Use flush to get intermediate emissions without stopping
        # This will return the current total emissions
        current_emissions = tracker.flush()
        
        # Try to access internal tracker data for power/energy metrics
        # These are stored in the _total_energy attribute (EmissionsData object)
        cpu_power = 0
        gpu_power = 0
        ram_power = 0
        cpu_energy = 0
        gpu_energy = 0  
        ram_energy = 0
        
        # Try to get energy data from the tracker's _total_energy object
        if hasattr(tracker, '_total_energy') and tracker._total_energy:
            energy_data = tracker._total_energy
            cpu_energy = getattr(energy_data, 'cpu_energy', 0)
            gpu_energy = getattr(energy_data, 'gpu_energy', 0)
            ram_energy = getattr(energy_data, 'ram_energy', 0)
        
        # Try to get power data from the tracker's _last_measured_power
        if hasattr(tracker, '_last_measured_power') and tracker._last_measured_power:
            power_data = tracker._last_measured_power
            cpu_power = getattr(power_data, 'cpu_power', 0)
            gpu_power = getattr(power_data, 'gpu_power', 0)
            ram_power = getattr(power_data, 'ram_power', 0)
        
        # Fallback: try direct attributes
        if cpu_energy == 0:
            cpu_energy = getattr(tracker, '_total_cpu_energy', 0)
        if gpu_energy == 0:
            gpu_energy = getattr(tracker, '_total_gpu_energy', 0)
        if ram_energy == 0:
            ram_energy = getattr(tracker, '_total_ram_energy', 0)
            
        if cpu_power == 0:
            cpu_power = getattr(tracker, '_cpu_power', 0)
        if gpu_power == 0:
            gpu_power = getattr(tracker, '_gpu_power', 0)
        if ram_power == 0:
            ram_power = getattr(tracker, '_ram_power', 0)
        
        metrics = {
            "type": "metrics",
            "timestamp": time.time(),
            "measure_power_secs": update_interval,
            "total_emissions": to_number(current_emissions),
            "cpu_power": to_number(cpu_power),
            "gpu_power": to_number(gpu_power),
            "ram_power": to_number(ram_power),
            "cpu_energy": to_number(cpu_energy),
            "gpu_energy": to_number(gpu_energy),
            "ram_energy": to_number(ram_energy),
        }
        print(f"METRICS:{json.dumps(metrics)}")
        sys.stdout.flush()
    except Exception as e:
        print(f"Error emitting metrics: {e}")
        import traceback
        traceback.print_exc()

def stop():
    """
    Stop the tracker and print a stop message.
    """
    emissions = tracker.stop()
    print("Tracker stopped.")
    print(f"Total emissions: {emissions}")

def signal_handler(sig, frame):
    """
    Handle termination signals by setting `running` to False.
    """
    global running
    print("Signal received, stopping the tracker...")
    running = False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Please provide 'start' as an argument.")
        sys.exit(1)

    print("Starting the tracker...")
    command = sys.argv[1].lower()
    if command == "start":
        # Register the signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, signal_handler)  # Handle Ctrl+C
        signal.signal(signal.SIGTERM, signal_handler)  # Handle termination signal
        start()
    else:
        print("Unknown command. Use 'start'.")
        sys.exit(1)
