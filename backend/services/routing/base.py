from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .sampler import Checkpoint


@dataclass
class RawRoute:
    route_id: str
    name: str
    summary: str
    distance_miles: float
    duration_seconds: float
    geometry_coordinates: list[tuple[float, float]]  # List of (lon, lat)
    checkpoints: list[Checkpoint] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "route_id": self.route_id,
            "name": self.name,
            "summary": self.summary,
            "distance_miles": round(self.distance_miles, 1),
            "duration_seconds": self.duration_seconds,
            "geometry_coordinates": self.geometry_coordinates,
            "checkpoints": [cp.to_dict() for cp in self.checkpoints],
        }


class BaseRoutingService(ABC):
    @abstractmethod
    def get_routes(
        self,
        origin: tuple[float, float],  # (lat, lon)
        destination: tuple[float, float],  # (lat, lon)
        departure_time: datetime,
        interval_miles: float = 25.0,
        target_count: int = 3,
    ) -> list[RawRoute]:
        """
        Generates candidate routes between origin and destination with sampled checkpoints.
        """
        pass
