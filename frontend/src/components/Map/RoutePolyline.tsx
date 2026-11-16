import React from 'react';
import { Polyline } from 'react-leaflet';
import { RouteSummary } from '../../types/trip';
import { getRouteColor } from '../../utils/routeColors';

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
      pane="routesPane"
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
