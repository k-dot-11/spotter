import React, { useEffect, useMemo, useRef } from 'react';
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

// Adjusts map bounds ONCE when a new trip is loaded, preventing tile cancellation / black box tearing
const MapBoundsAdjuster: React.FC<{ routes: RouteSummary[] }> = ({ routes }) => {
  const map = useMap();
  const lastKeyRef = useRef<string>('');

  useEffect(() => {
    if (!routes || routes.length === 0) return;

    // Unique signature for this route set (only refit when actual routes change, NOT on route selection/hover/slider)
    const currentKey = routes.map((r) => r.route_id).join('|');
    if (currentKey === lastKeyRef.current) return;
    lastKeyRef.current = currentKey;

    const allPoints: [number, number][] = [];
    routes.forEach((r) => {
      r.geometry_coordinates.forEach(([lon, lat]) => {
        allPoints.push([lat, lon]);
      });
    });

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      // animate: false prevents in-flight tile aborts and black square tearing
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12, animate: false });
    }
  }, [routes, map]);

  return null;
};

// Ensures map sizing is synchronized with fixed container once mounted
const MapInitialSizer: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

export const RouteMap: React.FC<RouteMapProps> = React.memo(({
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

  // Sort routes so unselected routes render first (bottom), and selected route renders last (on top)
  const sortedRoutes = useMemo(() => {
    return [...routes].sort((a, b) => {
      const aSelected = a.route_id === selectedRoute?.route_id;
      const bSelected = b.route_id === selectedRoute?.route_id;
      if (aSelected) return 1;
      if (bSelected) return -1;
      return 0;
    });
  }, [routes, selectedRoute]);

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

  // Initial center focused on the Chicago-Indianapolis corridor
  const defaultCenter: [number, number] = [40.825, -86.89];

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <MapContainer
        center={defaultCenter}
        zoom={7}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', background: '#e0e0e0' }}
      >
        {/* Esri World Street Map (Clean, Free, Zero API Keys, Standard Map Style) */}
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
          keepBuffer={6}
          updateWhenZooming={false}
          updateWhenIdle={false}
        />

        <MapInitialSizer />
        <MapBoundsAdjuster routes={routes} />

        {/* 1. Middle Layer: Weather Heatmap */}
        {showHeatmap && activeHeatmapPoints.length > 0 && (
          <HeatmapLayer
            points={activeHeatmapPoints}
            opacity={heatmapOpacity}
            metric={heatmapMetric}
          />
        )}

        {/* 2. Top Layer: Vector Route Polylines (Selected route rendered on top) */}
        {sortedRoutes.map((route) => (
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
});
