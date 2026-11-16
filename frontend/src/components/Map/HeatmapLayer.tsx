import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Ensure window.L is available for leaflet.heat plugin
if (typeof window !== 'undefined' && !(window as any).L) {
  (window as any).L = L;
}
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lon, intensity]
  opacity?: number;
  metric?: 'risk' | 'wind' | 'precip';
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  points,
  opacity = 0.55,
  metric = 'risk',
}) => {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);

  // Gradient configurations tailored to the selected metric
  const getGradient = () => {
    if (metric === 'wind') {
      return {
        0.2: '#38bdf8', // Calm / Light breeze (<25 mph)
        0.4: '#eab308', // Moderate (25-34 mph)
        0.6: '#f97316', // High (35-44 mph)
        0.8: '#ef4444', // Severe (45-54 mph)
        1.0: '#7f1d1d', // No Travel (≥55 mph)
      };
    }
    if (metric === 'precip') {
      return {
        0.2: '#93c5fd', // Light rain
        0.4: '#3b82f6', // Moderate
        0.6: '#6366f1', // Heavy rain / snow
        0.8: '#a855f7', // Severe snow storm
        1.0: '#701a75', // Extreme No Travel
      };
    }
    // Default: Overall Risk Gradient
    return {
      0.2: '#22c55e', // Green (Low Risk 1)
      0.4: '#eab308', // Yellow (Moderate Risk 2)
      0.6: '#f97316', // Orange (High Risk 3)
      0.8: '#ef4444', // Red (Severe Risk 4)
      1.0: '#7f1d1d', // Dark Burgundy (No Travel 5)
    };
  };

  const getMaxIntensity = () => {
    if (metric === 'wind') return 65.0; // mph
    if (metric === 'precip') return 2.5; // in/hr
    return 5.0; // Risk levels 1..5
  };

  useEffect(() => {
    if (!map) return;

    const options = {
      radius: 40,
      blur: 28,
      maxZoom: 13,
      max: getMaxIntensity(),
      minOpacity: opacity * 0.25,
      gradient: getGradient(),
    };

    if (!heatLayerRef.current) {
      if ((L as any).heatLayer) {
        heatLayerRef.current = (L as any).heatLayer(points, options).addTo(map);
      }
    } else {
      heatLayerRef.current.setLatLngs(points);
      heatLayerRef.current.setOptions({
        ...options,
        gradient: getGradient(),
        max: getMaxIntensity(),
        minOpacity: opacity * 0.25,
      });
    }

    return () => {
      if (heatLayerRef.current && map) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [map, metric, opacity]);

  // Instant in-memory update on slider scrub
  useEffect(() => {
    if (heatLayerRef.current) {
      heatLayerRef.current.setLatLngs(points);
    }
  }, [points]);

  return null;
};
