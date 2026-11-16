import React from 'react';
import { Box, Card, Typography, Chip, Tooltip, CardContent } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import TimerIcon from '@mui/icons-material/Timer';
import RouteIcon from '@mui/icons-material/Route';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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
      <Typography variant="subtitle2" color="text.secondary">
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
            variant="outlined"
            onClick={() => onSelectRoute(route.route_id)}
            sx={{
              cursor: 'pointer',
              borderWidth: isSelected ? 2 : 1,
              borderColor: isSelected
                ? isRecommended
                  ? 'success.main'
                  : 'primary.main'
                : 'divider',
              boxShadow: isSelected ? 2 : 0,
              bgcolor: isSelected ? 'action.selected' : 'background.paper',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              {/* Header: Badge & Status */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isRecommended ? (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Recommended"
                      color="success"
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  ) : hasNoTravel ? (
                    <Chip
                      icon={<BlockIcon />}
                      label="No Travel Warning"
                      color="error"
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  ) : (
                    <Chip
                      label={`Option ${route.rank}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Avg Risk: <strong>{route.average_risk.toFixed(1)}</strong>
                </Typography>
              </Box>

              {/* Route Name */}
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                {route.route_name}
              </Typography>

              {/* Travel Stats: Time & Distance */}
              <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <TimerIcon fontSize="small" color="primary" /> {route.duration_formatted}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <RouteIcon fontSize="small" color="action" /> {route.total_distance_miles} mi
                </Typography>
              </Box>

              {/* Stacked Risk Progress Bar */}
              <Tooltip title="Risk mileage breakdown: Green (Low), Yellow (Moderate), Orange (High), Red (Severe), Dark Red (No Travel)" arrow>
                <Box
                  sx={{
                    display: 'flex',
                    height: 6,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'grey.200',
                    mb: 1.5,
                  }}
                >
                  {lowPct > 0 && <Box sx={{ width: `${lowPct}%`, bgcolor: '#2e7d32' }} />}
                  {modPct > 0 && <Box sx={{ width: `${modPct}%`, bgcolor: '#ed6c02' }} />}
                  {highPct > 0 && <Box sx={{ width: `${highPct}%`, bgcolor: '#ef6c00' }} />}
                  {sevPct > 0 && <Box sx={{ width: `${sevPct}%`, bgcolor: '#d32f2f' }} />}
                  {noTravelPct > 0 && <Box sx={{ width: `${noTravelPct}%`, bgcolor: '#7f1d1d' }} />}
                </Box>
              </Tooltip>

              {/* Mile Metrics Pills */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                <Chip
                  label={`${route.severe_miles} mi Severe`}
                  size="small"
                  color={route.severe_miles > 0 ? 'error' : 'default'}
                  variant="outlined"
                />
                <Chip
                  label={`${route.high_miles} mi High`}
                  size="small"
                  color={route.high_miles > 0 ? 'warning' : 'default'}
                  variant="outlined"
                />
                {route.no_travel_miles > 0 && (
                  <Chip
                    label={`${route.no_travel_miles} mi No Travel`}
                    size="small"
                    color="error"
                  />
                )}
              </Box>

              {/* Recommendation Reasoning / Hazard Note */}
              <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {isRecommended ? (
                  <span style={{ color: '#2e7d32', fontWeight: 500 }}>★ {route.recommendation_reason}</span>
                ) : hasNoTravel ? (
                  <span style={{ color: '#d32f2f', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <WarningAmberIcon fontSize="small" />
                    {route.recommendation_reason}
                  </span>
                ) : (
                  route.recommendation_reason
                )}
              </Typography>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};
