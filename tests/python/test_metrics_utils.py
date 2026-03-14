import unittest

from src.scripts.metrics_utils import to_number


class PowerLike:
    def __init__(self, value):
        self.value = value


class NestedPowerLike:
    def __init__(self, value):
        self.power = PowerLike(value)


class TestMetricsUtils(unittest.TestCase):
    def test_to_number_handles_power_wrapper(self):
        self.assertEqual(to_number(PowerLike(12.34)), 12.34)

    def test_to_number_handles_nested_wrapper(self):
        self.assertEqual(to_number(NestedPowerLike(5.67)), 5.67)

    def test_to_number_invalid_returns_zero(self):
        self.assertEqual(to_number(object()), 0.0)


if __name__ == "__main__":
    unittest.main()
