from abc import ABC, abstractmethod
from datetime import datetime

from .schemas import RawRoute


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
