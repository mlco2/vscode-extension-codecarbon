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


if __name__ == "__main__":
    unittest.main()
