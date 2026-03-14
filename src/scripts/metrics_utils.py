"""
Utilities for normalizing CodeCarbon metric values for JSON serialization.
"""

from numbers import Number


def to_number(value):
    """Best-effort conversion for CodeCarbon numeric/unit wrapper values."""
    if value is None:
        return 0.0

    if isinstance(value, Number):
        return float(value)

    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return 0.0

    # Common wrapped numeric shapes in dependency objects.
    for attr in ("value", "power", "energy"):
        candidate = getattr(value, attr, None)
        if candidate is not None and candidate is not value:
            converted = to_number(candidate)
            if converted != 0.0:
                return converted

    # Last chance: parse any numeric-looking attribute.
    if hasattr(value, "__dict__"):
        for nested in vars(value).values():
            converted = to_number(nested)
            if converted != 0.0:
                return converted

    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0
