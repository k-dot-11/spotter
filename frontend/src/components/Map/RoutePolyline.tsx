import React from 'react';
import { Polyline } from 'react-leaflet';
import { RouteSummary } from '../../types/trip';

export const getRouteColor = (route: RouteSummary): string => {
  if (route.has_no_travel) return '#d32f2f'; // Red (No Travel)
  if (route.is_recommended) return '#2e7d32'; // Forest Green (Safest / Recommended)
  if (route.rank === 2) return '#1976d2'; // Blue (Option 2)
  if (route.rank === 3) return '#7b1fa2'; // Purple (Option 3)
  return '#0288d1';
};

interface RoutePolylineProps {
  route: RouteSummary;
  isSelected: boolean;
  onSelect: (routeId: string) => void;
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({
  route,
  isSelected,
  onSelect,
}) => {
  // Convert [lon, lat] (GeoJSON) to [lat, lon] (Leaflet)
  const positions: [number, number][] = route.geometry_coordinates.map(([lon, lat]) => [lat, lon]);

  if (positions.length === 0) return null;

  const routeColor = getRouteColor(route);

  return (
    <Polyline
      positions={positions}
      eventHandlers={{
        click: () => onSelect(route.route_id),
      }}
      pathOptions={{
        color: routeColor,
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 1.0 : 0.65,
        dashArray: isSelected ? undefined : '6, 6',
        lineCap: 'round',
        lineJoin: 'round',
      }}
    />
  );
};
