"""
Spatial Polyline Interpolator and Checkpoint Sampler.
Samples route coordinates every 10 / 25 / 50 miles, attaching accurate arrival ETAs.
"""

from datetime import datetime, timedelta

from services.common.geo import haversine_distance_miles

from .schemas import Checkpoint


def sample_checkpoints_along_polyline(
    coordinates: list[tuple[float, float]],  # List of (lon, lat) as returned by GeoJSON
    total_distance_miles: float,
    total_duration_seconds: float,
    departure_time: datetime,
    interval_miles: float = 25.0,
) -> list[Checkpoint]:
    """
    Interpolates points along a GeoJSON coordinates list at every interval_miles.
    Always includes origin (0.0 mi) and destination (total_distance_miles).
    """
    if not coordinates:
        return []

    if len(coordinates) == 1 or total_distance_miles <= 0:
        lon, lat = coordinates[0]
        return [
            Checkpoint(
                index=0,
                lat=lat,
                lon=lon,
                distance_from_start_miles=0.0,
                segment_miles=0.0,
                eta=departure_time,
                eta_iso=departure_time.isoformat(),
                elapsed_seconds=0.0,
            )
        ]

    # Calculate cumulative distance along polyline segments
    cum_dists = [0.0]
    for i in range(1, len(coordinates)):
        lon1, lat1 = coordinates[i - 1]
        lon2, lat2 = coordinates[i]
        d = haversine_distance_miles(lat1, lon1, lat2, lon2)
        cum_dists.append(cum_dists[-1] + d)

    raw_total_dist = cum_dists[-1]
    # Normalize distances to match routing engine's authoritative total_distance_miles
    scale = (total_distance_miles / raw_total_dist) if raw_total_dist > 0 else 1.0
    normalized_cum_dists = [d * scale for d in cum_dists]

    # Generate target milestone distances (0, interval, 2*interval, ..., total)
    target_distances: list[float] = [0.0]
    current = interval_miles
    while current < total_distance_miles - (interval_miles * 0.25):  # Avoid clustering near the end
        target_distances.append(current)
        current += interval_miles
    target_distances.append(total_distance_miles)

    checkpoints: list[Checkpoint] = []
    seg_idx = 0
    num_segments = len(coordinates) - 1

    for idx, target_d in enumerate(target_distances):
        # Determine segment miles represented by this checkpoint
        if idx == 0:
            segment_miles = 0.0
        else:
            segment_miles = target_d - target_distances[idx - 1]

        # Elapsed time proportional to distance along route
        ratio = (target_d / total_distance_miles) if total_distance_miles > 0 else 0.0
        elapsed_sec = total_duration_seconds * ratio
        eta = departure_time + timedelta(seconds=elapsed_sec)

        # Handle origin point
        if target_d == 0.0:
            lon, lat = coordinates[0]
            checkpoints.append(
                Checkpoint(
                    index=idx,
                    lat=lat,
                    lon=lon,
                    distance_from_start_miles=0.0,
                    segment_miles=0.0,
                    eta=eta,
                    eta_iso=eta.isoformat(),
                    elapsed_seconds=0.0,
                )
            )
            continue

        # Handle final point
        if target_d >= total_distance_miles:
            lon, lat = coordinates[-1]
            checkpoints.append(
                Checkpoint(
                    index=idx,
                    lat=lat,
                    lon=lon,
                    distance_from_start_miles=total_distance_miles,
                    segment_miles=segment_miles,
                    eta=eta,
                    eta_iso=eta.isoformat(),
                    elapsed_seconds=elapsed_sec,
                )
            )
            continue

        # Interpolate along polyline segments
        while seg_idx < num_segments and normalized_cum_dists[seg_idx + 1] < target_d:
            seg_idx += 1

        seg_start_d = normalized_cum_dists[seg_idx]
        seg_end_d = normalized_cum_dists[min(seg_idx + 1, len(normalized_cum_dists) - 1)]
        seg_len = seg_end_d - seg_start_d

        if seg_len > 0:
            t = (target_d - seg_start_d) / seg_len
            t = max(0.0, min(1.0, t))
        else:
            t = 0.0

        lon1, lat1 = coordinates[seg_idx]
        lon2, lat2 = coordinates[min(seg_idx + 1, len(coordinates) - 1)]

        interp_lat = lat1 + t * (lat2 - lat1)
        interp_lon = lon1 + t * (lon2 - lon1)

        checkpoints.append(
            Checkpoint(
                index=idx,
                lat=interp_lat,
                lon=interp_lon,
                distance_from_start_miles=target_d,
                segment_miles=segment_miles,
                eta=eta,
                eta_iso=eta.isoformat(),
                elapsed_seconds=elapsed_sec,
            )
        )

    return checkpoints
