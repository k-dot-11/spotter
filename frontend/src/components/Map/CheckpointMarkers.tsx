import React from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { Box, Typography, Chip, Divider } from '@mui/material';
import AirIcon from '@mui/icons-material/Air';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { CheckpointData } from '../../types/trip';

interface CheckpointMarkersProps {
  checkpoints: CheckpointData[];
}

export const CheckpointMarkers: React.FC<CheckpointMarkersProps> = ({ checkpoints }) => {
  if (!checkpoints || checkpoints.length === 0) return null;

  return (
    <>
      {checkpoints.map((cp) => {
        const isHazard = cp.risk_score >= 3; // High, Severe, No Travel
        const isNoTravel = cp.risk_score === 5;

        const etaFormatted = new Date(cp.eta_iso).toLocaleTimeString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });

        return (
          <CircleMarker
            key={`cp-${cp.index}-${cp.distance_from_start_miles}`}
            center={[cp.lat, cp.lon]}
            radius={isNoTravel ? 9 : isHazard ? 8 : 6}
            pathOptions={{
              color: '#0f172a',
              weight: 2,
              fillColor: cp.risk.risk_color,
              fillOpacity: 0.95,
            }}
          >
            <Popup className="custom-dark-popup">
              <Box sx={{ p: 1, minWidth: 200, color: '#f8fafc', backgroundColor: '#0f172a' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc' }}>
                    Mile {cp.distance_from_start_miles.toFixed(1)}
                  </Typography>
                  <Chip
                    label={cp.risk.risk_label}
                    size="small"
                    sx={{
                      backgroundColor: cp.risk.risk_color,
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      height: 20,
                    }}
                  />
                </Box>

                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1 }}>
                  ETA: <strong>{etaFormatted}</strong>
                </Typography>

                <Divider sx={{ my: 0.8, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                {/* Weather Breakdown */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
                      <AirIcon sx={{ fontSize: 14, color: '#38bdf8' }} /> Wind Speed:
                    </span>
                    <strong style={{ fontFamily: 'monospace' }}>{cp.weather.wind_mph.toFixed(1)} mph</strong>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
                      <WaterDropIcon sx={{ fontSize: 14, color: '#60a5fa' }} /> Rain Rate:
                    </span>
                    <strong style={{ fontFamily: 'monospace' }}>{cp.weather.rain_in_per_hr.toFixed(2)} in/hr</strong>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
                      <AcUnitIcon sx={{ fontSize: 14, color: '#93c5fd' }} /> Snow Rate:
                    </span>
                    <strong style={{ fontFamily: 'monospace' }}>{cp.weather.snow_in_per_hr.toFixed(2)} in/hr</strong>
                  </Box>
                </Box>

                {/* Load Weight Escalation Notice */}
                {cp.risk.load_escalation_applied && cp.risk.escalation_reason && (
                  <Box
                    sx={{
                      mt: 0.8,
                      p: 0.8,
                      borderRadius: 1,
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#fca5a5',
                      fontSize: '0.68rem',
                      lineHeight: 1.3,
                    }}
                  >
                    <WarningAmberIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.5 }} />
                    <strong>Load Rule Applied:</strong> {cp.risk.escalation_reason}
                  </Box>
                )}
              </Box>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
};
