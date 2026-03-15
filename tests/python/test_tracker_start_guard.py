import pathlib
import re
import unittest


class TestTrackerStartGuard(unittest.TestCase):
    def test_tracker_exits_when_another_instance_is_running(self):
        tracker_script = pathlib.Path("src/scripts/tracker.py").read_text(encoding="utf-8")
        self.assertRegex(
            tracker_script,
            r"_another_instance_already_running",
            "tracker.py should check for CodeCarbon lock contention before entering the metrics loop.",
        )
        self.assertRegex(
            tracker_script,
            r"sys\.exit\(1\)",
            "tracker.py should exit with failure when tracker start is blocked.",
        )


if __name__ == "__main__":
    unittest.main()
