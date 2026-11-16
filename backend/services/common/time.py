"""
Shared Time and Duration Utilities.
"""


def format_duration(seconds: float) -> str:
    """
    Formats seconds into a human-readable 'Xh Ym' string.
    Examples:
        3600 -> "1h 0m"
        5400 -> "1h 30m"
        1800 -> "30m"
        0    -> "0m"
    """
    total_seconds = max(0, int(seconds))
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60

    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"
