import pathlib
import re
import unittest


class TestTrackerRunPolicy(unittest.TestCase):
    def test_tracker_disables_multiple_runs(self):
        tracker_script = pathlib.Path("src/scripts/tracker.py").read_text(encoding="utf-8")
        pattern = r"EmissionsTracker\s*\(\s*allow_multiple_runs\s*=\s*False\s*\)"
        self.assertRegex(
            tracker_script,
            pattern,
            "tracker.py must enforce allow_multiple_runs=False to prevent duplicate tracker sessions.",
        )

    def test_tracker_supports_emissions_file_override(self):
        tracker_script = pathlib.Path("src/scripts/tracker.py").read_text(encoding="utf-8")
        self.assertIn(
            '--emissions-file',
            tracker_script,
            "tracker.py should support overriding the CSV destination via --emissions-file.",
        )


if __name__ == "__main__":
    unittest.main()
