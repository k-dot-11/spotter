import React from 'react';
import { Polyline } from 'react-leaflet';
import { RouteSummary } from '../../types/trip';

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

  const isRecommended = route.is_recommended;
  const hasNoTravel = route.has_no_travel;

  // Colors
  const mainColor = isRecommended ? '#10b981' : hasNoTravel ? '#ef4444' : '#38bdf8';

  return (
    <>
      {/* Background shadow/border for crisp visibility against heatmap and basemap */}
      {isSelected && (
        <Polyline
          positions={positions}
          pathOptions={{
            color: '#030712',
            weight: 9,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {/* Main Vector Road Polyline */}
      <Polyline
        positions={positions}
        eventHandlers={{
          click: () => onSelect(route.route_id),
        }}
        pathOptions={{
          color: isSelected ? mainColor : '#64748b',
          weight: isSelected ? 5 : 3.5,
          opacity: isSelected ? 1.0 : 0.45,
          dashArray: isSelected ? undefined : '5, 8',
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </>
  );
};
