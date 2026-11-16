import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Box } from '@mui/material';
import { RouteSummary, CorridorHeatmapTimeline } from '../../types/trip';
import { RoutePolyline } from './RoutePolyline';
import { CheckpointMarkers } from './CheckpointMarkers';
import { HeatmapLayer } from './HeatmapLayer';
import { TimelineSlider, HeatmapMetric } from './TimelineSlider';
import { MapLegend } from './MapLegend';

interface RouteMapProps {
  routes: RouteSummary[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  corridorHeatmap?: CorridorHeatmapTimeline;
  departureTimeIso?: string;
  forecastHour: number;
  onHourChange: (hour: number | ((prev: number) => number)) => void;
  heatmapMetric: HeatmapMetric;
  onMetricChange: (metric: HeatmapMetric) => void;
  showHeatmap: boolean;
  onToggleHeatmap: (show: boolean) => void;
  heatmapOpacity: number;
  onOpacityChange: (opacity: number) => void;
}

// Automatically fits map viewport to the extent of all routes
const MapBoundsAdjuster: React.FC<{ routes: RouteSummary[] }> = ({ routes }) => {
  const map = useMap();

  useEffect(() => {
    if (!routes || routes.length === 0) return;

    const allPoints: [number, number][] = [];
    routes.forEach((r) => {
      r.geometry_coordinates.forEach(([lon, lat]) => {
        allPoints.push([lat, lon]);
      });
    });

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
    }
  }, [routes, map]);

  return null;
};

export const RouteMap: React.FC<RouteMapProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  corridorHeatmap,
  departureTimeIso,
  forecastHour,
  onHourChange,
  heatmapMetric,
  onMetricChange,
  showHeatmap,
  onToggleHeatmap,
  heatmapOpacity,
  onOpacityChange,
}) => {
  const selectedRoute = useMemo(
    () => routes.find((r) => r.route_id === selectedRouteId) || routes[0],
    [routes, selectedRouteId]
  );

  // Derive active heatmap points [lat, lon, intensity] in-memory for 60fps performance
  const activeHeatmapPoints = useMemo(() => {
    if (!corridorHeatmap || !corridorHeatmap.points) return [];

    return corridorHeatmap.points.map((p) => {
      let intensity = 1.0;
      if (heatmapMetric === 'wind') {
        intensity = p.wind_timeline[forecastHour] ?? 0.0;
      } else if (heatmapMetric === 'precip') {
        intensity = p.precip_timeline[forecastHour] ?? 0.0;
      } else {
        // 'risk' level 1..5
        intensity = p.risk_timeline[forecastHour] ?? 1.0;
      }
      return [p.lat, p.lon, intensity] as [number, number, number];
    });
  }, [corridorHeatmap, forecastHour, heatmapMetric]);

  // Default initial center (US Midwest / National)
  const defaultCenter: [number, number] = [39.8283, -98.5795];

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <MapContainer
        center={defaultCenter}
        zoom={5}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', background: '#090d16' }}
      >
        {/* Official OpenStreetMap Standard Basemap (100% Free, Zero API Keys, Globally Open) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapBoundsAdjuster routes={routes} />

        {/* 1. Middle Layer: Weather Heatmap */}
        {showHeatmap && activeHeatmapPoints.length > 0 && (
          <HeatmapLayer
            points={activeHeatmapPoints}
            opacity={heatmapOpacity}
            metric={heatmapMetric}
          />
        )}

        {/* 2. Top Layer: Vector Route Polylines */}
        {routes.map((route) => (
          <RoutePolyline
            key={route.route_id}
            route={route}
            isSelected={route.route_id === selectedRoute?.route_id}
            onSelect={onSelectRoute}
          />
        ))}

        {/* 3. Checkpoint Markers on the Selected Route */}
        {selectedRoute && <CheckpointMarkers checkpoints={selectedRoute.checkpoints} />}
      </MapContainer>

      {/* Floating Map Legend */}
      <MapLegend />

      {/* Floating 0–48h Forecast Timeline Slider */}
      {corridorHeatmap && (
        <TimelineSlider
          forecastHour={forecastHour}
          onHourChange={onHourChange}
          maxHours={corridorHeatmap.max_forecast_hours}
          departureTimeIso={departureTimeIso}
          heatmapMetric={heatmapMetric}
          onMetricChange={onMetricChange}
          showHeatmap={showHeatmap}
          onToggleHeatmap={onToggleHeatmap}
          heatmapOpacity={heatmapOpacity}
          onOpacityChange={onOpacityChange}
        />
      )}
    </Box>
  );
};
