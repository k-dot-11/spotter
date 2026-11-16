import React from 'react';
import { CircleMarker, Popup } from 'react-leaflet';
import { Box, Typography, Chip, Divider } from '@mui/material';
import AirIcon from '@mui/icons-material/Air';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { CheckpointData } from '../../types/trip';

interface CheckpointMarkersProps {
  checkpoints: CheckpointData[];
}

export const CheckpointMarkers: React.FC<CheckpointMarkersProps> = ({ checkpoints }) => {
  if (!checkpoints || checkpoints.length === 0) return null;

  return (
    <>
      {checkpoints.map((cp) => {
        const isHazard = cp.risk_score >= 3;
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
              color: '#1e293b',
              weight: 1.5,
              fillColor: cp.risk.risk_color,
              fillOpacity: 1.0,
            }}
          >
            <Popup>
              <Box sx={{ p: 0.5, minWidth: 190 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Mile {cp.distance_from_start_miles.toFixed(1)}
                  </Typography>
                  <Chip
                    label={cp.risk.risk_label}
                    size="small"
                    sx={{
                      backgroundColor: cp.risk.risk_color,
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      height: 20,
                    }}
                  />
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  ETA: <strong>{etaFormatted}</strong>
                </Typography>

                <Divider sx={{ my: 0.8 }} />

                {/* Weather Breakdown */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666' }}>
                      <AirIcon fontSize="inherit" color="action" /> Wind Speed:
                    </span>
                    <strong>{cp.weather.wind_mph.toFixed(1)} mph</strong>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666' }}>
                      <WaterDropIcon fontSize="inherit" color="action" /> Rain Rate:
                    </span>
                    <strong>{cp.weather.rain_in_per_hr.toFixed(2)} in/hr</strong>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666' }}>
                      <AcUnitIcon fontSize="inherit" color="action" /> Snow Rate:
                    </span>
                    <strong>{cp.weather.snow_in_per_hr.toFixed(2)} in/hr</strong>
                  </Box>
                </Box>

                {/* Load Weight Escalation Notice */}
                {cp.risk.load_escalation_applied && cp.risk.escalation_reason && (
                  <Box
                    sx={{
                      mt: 0.8,
                      p: 0.8,
                      borderRadius: 1,
                      bgcolor: 'error.light',
                      color: 'error.contrastText',
                      fontSize: '0.7rem',
                    }}
                  >
                    <strong>Escalation:</strong> {cp.risk.escalation_reason}
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
