import React from 'react';
import { Box, Card, Typography, Chip, Tooltip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BlockIcon from '@mui/icons-material/Block';
import TimerIcon from '@mui/icons-material/Timer';
import RouteIcon from '@mui/icons-material/Route';
import { RouteSummary } from '../../types/trip';

interface RouteCardListProps {
  routes: RouteSummary[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
}

export const RouteCardList: React.FC<RouteCardListProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  if (!routes || routes.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Route Options Evaluated ({routes.length})
      </Typography>

      {routes.map((route) => {
        const isSelected = route.route_id === selectedRouteId;
        const isRecommended = route.is_recommended;
        const hasNoTravel = route.has_no_travel;

        // Calculate mileage proportions for the stacked risk bar
        const total = route.total_distance_miles || 1;
        const lowPct = ((route.low_miles || 0) / total) * 100;
        const modPct = ((route.moderate_miles || 0) / total) * 100;
        const highPct = ((route.high_miles || 0) / total) * 100;
        const sevPct = ((route.severe_miles || 0) / total) * 100;
        const noTravelPct = ((route.no_travel_miles || 0) / total) * 100;

        return (
          <Card
            key={route.route_id}
            onClick={() => onSelectRoute(route.route_id)}
            sx={{
              p: 1.6,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              border: isSelected
                ? isRecommended
                  ? '2px solid #10b981'
                  : '2px solid #38bdf8'
                : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: isSelected
                ? isRecommended
                  ? 'rgba(16, 185, 129, 0.06)'
                  : 'rgba(56, 189, 248, 0.06)'
                : '#111827',
              '&:hover': {
                borderColor: isRecommended ? '#10b981' : '#38bdf8',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
              },
            }}
          >
            {/* Header: Badge & Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                {isRecommended ? (
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#fff !important' }} />}
                    label="RECOMMENDED"
                    size="small"
                    sx={{
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      height: 22,
                    }}
                  />
                ) : hasNoTravel ? (
                  <Chip
                    icon={<BlockIcon sx={{ fontSize: '13px !important', color: '#fff !important' }} />}
                    label="NO TRAVEL WARNING"
                    size="small"
                    sx={{
                      backgroundColor: '#7f1d1d',
                      color: '#fecaca',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      height: 22,
                    }}
                  />
                ) : (
                  <Chip
                    label={`OPTION ${route.rank}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#94a3b8',
                      fontSize: '0.68rem',
                      height: 22,
                    }}
                  />
                )}
              </Box>

              <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                Avg Risk: <strong style={{ color: route.average_risk > 3 ? '#ef4444' : route.average_risk > 2 ? '#f59e0b' : '#10b981' }}>{route.average_risk.toFixed(1)}</strong>
              </Typography>
            </Box>

            {/* Route Name */}
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: isSelected ? '#f8fafc' : '#cbd5e1' }}>
              {route.route_name}
            </Typography>

            {/* Travel Stats: Time & Distance */}
            <Box sx={{ display: 'flex', gap: 2, mb: 1.2 }}>
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#e2e8f0', fontFamily: 'monospace' }}>
                <TimerIcon sx={{ fontSize: 14, color: '#38bdf8' }} /> {route.duration_formatted}
              </Typography>
              <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#e2e8f0', fontFamily: 'monospace' }}>
                <RouteIcon sx={{ fontSize: 14, color: '#94a3b8' }} /> {route.total_distance_miles} mi
              </Typography>
            </Box>

            {/* Stacked Risk Progress Bar */}
            <Tooltip title="Mileage breakdown: Green (Low), Yellow (Moderate), Orange (High), Red (Severe), Dark Red (No Travel)" arrow>
              <Box
                sx={{
                  display: 'flex',
                  height: 6,
                  borderRadius: 3,
                  overflow: 'hidden',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  mb: 1.2,
                }}
              >
                {lowPct > 0 && <Box sx={{ width: `${lowPct}%`, backgroundColor: '#22c55e' }} />}
                {modPct > 0 && <Box sx={{ width: `${modPct}%`, backgroundColor: '#eab308' }} />}
                {highPct > 0 && <Box sx={{ width: `${highPct}%`, backgroundColor: '#f97316' }} />}
                {sevPct > 0 && <Box sx={{ width: `${sevPct}%`, backgroundColor: '#ef4444' }} />}
                {noTravelPct > 0 && <Box sx={{ width: `${noTravelPct}%`, backgroundColor: '#7f1d1d' }} />}
              </Box>
            </Tooltip>

            {/* Mile Metrics Pills */}
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 1 }}>
              <Chip
                label={`${route.severe_miles} mi Severe`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  backgroundColor: route.severe_miles > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: route.severe_miles > 0 ? '#fca5a5' : '#94a3b8',
                }}
              />
              <Chip
                label={`${route.high_miles} mi High`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  backgroundColor: route.high_miles > 0 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: route.high_miles > 0 ? '#fdba74' : '#94a3b8',
                }}
              />
              {route.no_travel_miles > 0 && (
                <Chip
                  label={`${route.no_travel_miles} mi No Travel`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    backgroundColor: 'rgba(127, 29, 29, 0.3)',
                    color: '#fca5a5',
                    fontWeight: 700,
                  }}
                />
              )}
            </Box>

            {/* Recommendation Reasoning / Hazard Note */}
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 0.5, lineHeight: 1.3 }}>
              {isRecommended ? (
                <span style={{ color: '#34d399' }}>★ {route.recommendation_reason}</span>
              ) : hasNoTravel ? (
                <span style={{ color: '#f87171' }}>
                  <WarningAmberIcon sx={{ fontSize: 12, verticalAlign: 'middle', mr: 0.3 }} />
                  {route.recommendation_reason}
                </span>
              ) : (
                route.recommendation_reason
              )}
            </Typography>
          </Card>
        );
      })}
    </Box>
  );
};
