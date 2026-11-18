import React from 'react';
import { Box, Card, Typography, Chip, Tooltip, CardContent } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StraightenIcon from '@mui/icons-material/Straighten';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ShieldIcon from '@mui/icons-material/Shield';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { RouteSummary } from '../../types/trip';
import { getRouteColor } from '../../utils/routeColors';

interface RouteCardListProps {
  routes: RouteSummary[];
  selectedRouteId: string;
  onSelectRoute: (routeId: string) => void;
}

const formatDelta = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
};

export const RouteCardList: React.FC<RouteCardListProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  if (!routes || routes.length === 0) return null;

  const recRoute = routes.find((r) => r.is_recommended) || routes[0];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mt: 0.5 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Route Options ({routes.length})
      </Typography>

      {routes.map((route) => {
        const isSelected = route.route_id === selectedRouteId;
        const isRecommended = route.is_recommended;
        const hasNoTravel = route.has_no_travel;
        const isAllClear = route.severe_miles === 0 && route.high_miles === 0 && route.no_travel_miles === 0;

        // Clean route title (strips redundant "Option \d+:\s*" prefix from routing engines)
        const cleanTitle = route.route_name.replace(/^Option\s*\d+:\s*/i, '').trim() || route.route_name;

        // Mileage breakdown for the stacked risk bar
        const total = route.total_distance_miles || 1;
        const lowPct = ((route.low_miles || 0) / total) * 100;
        const modPct = ((route.moderate_miles || 0) / total) * 100;
        const highPct = ((route.high_miles || 0) / total) * 100;
        const sevPct = ((route.severe_miles || 0) / total) * 100;
        const noTravelPct = ((route.no_travel_miles || 0) / total) * 100;

        const routeColor = getRouteColor(route);
        const timeDeltaSec = route.duration_seconds - recRoute.duration_seconds;

        return (
          <Card
            key={route.route_id}
            variant="outlined"
            onClick={() => onSelectRoute(route.route_id)}
            sx={{
              cursor: 'pointer',
              borderLeft: `4px solid ${routeColor}`,
              borderColor: isSelected ? routeColor : 'rgba(255, 255, 255, 0.08)',
              bgcolor: isSelected ? 'rgba(0, 129, 112, 0.12)' : 'background.paper',
              boxShadow: isSelected ? '0 4px 16px rgba(0, 0, 0, 0.35)' : 'none',
              transition: 'all 0.15s ease-in-out',
              '&:hover': {
                bgcolor: isSelected ? 'rgba(0, 129, 112, 0.16)' : 'action.hover',
                borderColor: isSelected ? routeColor : 'rgba(255, 255, 255, 0.18)',
              },
            }}
          >
            <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
              {/* Top Row: Route Badge & Risk Score */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isRecommended ? (
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize: '15px !important' }} />}
                      label="Recommended"
                      size="small"
                      sx={{
                        fontWeight: 700,
                        height: 24,
                        fontSize: '0.72rem',
                        bgcolor: 'rgba(0, 129, 112, 0.2)',
                        color: '#00b89f',
                        borderColor: '#008170',
                      }}
                      variant="outlined"
                    />
                  ) : hasNoTravel ? (
                    <Chip
                      icon={<BlockIcon sx={{ fontSize: '14px !important' }} />}
                      label="No Travel"
                      color="error"
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, height: 24, fontSize: '0.72rem' }}
                    />
                  ) : (
                    <Chip
                      label={`Option ${route.rank}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: routeColor,
                        color: routeColor,
                        fontWeight: 700,
                        height: 24,
                        fontSize: '0.72rem',
                      }}
                    />
                  )}
                </Box>

                {/* Compact Risk Score */}
                <Tooltip title={`Average Risk: ${route.average_risk.toFixed(2)} / 5.0`} arrow>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      bgcolor: 'rgba(255, 255, 255, 0.04)',
                    }}
                  >
                    <ShieldIcon sx={{ fontSize: 13, color: route.average_risk > 2 ? '#f97316' : '#008170' }} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: 'text.secondary',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.75rem',
                      }}
                    >
                      {route.average_risk.toFixed(1)}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>

              {/* Route Main Title */}
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary',
                  lineHeight: 1.35,
                  mb: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {cleanTitle}
              </Typography>

              {/* Key Metrics: Time, Distance, and Clear Status */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', mb: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 15, color: isRecommended ? '#00b89f' : 'text.secondary' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.82rem' }}>
                    {route.duration_formatted}
                  </Typography>
                </Box>

                <Typography variant="caption" sx={{ color: 'text.disabled' }}>&bull;</Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <StraightenIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                    {route.total_distance_miles.toLocaleString()} mi
                  </Typography>
                </Box>

                {isAllClear && (
                  <>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>&bull;</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#00b89f' }}>
                      <CheckCircleIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#00b89f', fontSize: '0.75rem' }}>
                        Clear
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>

              {/* Multi-Segment Risk Mileage Bar */}
              <Tooltip
                title={`Risk Breakdown: Low: ${route.low_miles} mi | Mod: ${route.moderate_miles} mi | High: ${route.high_miles} mi | Severe: ${route.severe_miles} mi`}
                arrow
              >
                <Box
                  sx={{
                    display: 'flex',
                    height: 4,
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    mb: (hasNoTravel || route.severe_miles > 0 || route.high_miles > 0 || (!isRecommended && timeDeltaSec !== 0)) ? 1 : 0,
                  }}
                >
                  {lowPct > 0 && <Box sx={{ width: `${lowPct}%`, bgcolor: '#008170' }} />}
                  {modPct > 0 && <Box sx={{ width: `${modPct}%`, bgcolor: '#eab308' }} />}
                  {highPct > 0 && <Box sx={{ width: `${highPct}%`, bgcolor: '#f97316' }} />}
                  {sevPct > 0 && <Box sx={{ width: `${sevPct}%`, bgcolor: '#ef4444' }} />}
                  {noTravelPct > 0 && <Box sx={{ width: `${noTravelPct}%`, bgcolor: '#7f1d1d' }} />}
                </Box>
              </Tooltip>

              {/* Hazard Warning Pills (Only rendered when hazards actually exist) */}
              {(hasNoTravel || route.severe_miles > 0 || route.high_miles > 0 || (!isRecommended && timeDeltaSec !== 0)) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.75 }}>
                  {route.no_travel_miles > 0 && (
                    <Chip
                      size="small"
                      icon={<BlockIcon sx={{ fontSize: '12px !important' }} />}
                      label={`${route.no_travel_miles} mi No Travel`}
                      color="error"
                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                    />
                  )}
                  {route.severe_miles > 0 && (
                    <Chip
                      size="small"
                      icon={<ErrorOutlineIcon sx={{ fontSize: '12px !important' }} />}
                      label={`${route.severe_miles} mi Severe`}
                      color="error"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                    />
                  )}
                  {route.high_miles > 0 && (
                    <Chip
                      size="small"
                      icon={<WarningAmberIcon sx={{ fontSize: '12px !important' }} />}
                      label={`${route.high_miles} mi High`}
                      sx={{
                        height: 20,
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        borderColor: '#f97316',
                        color: '#f97316',
                      }}
                      variant="outlined"
                    />
                  )}

                  {/* Relative Delta vs Recommended Route */}
                  {!isRecommended && timeDeltaSec > 60 && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', ml: 'auto' }}>
                      <TrendingUpIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', fontWeight: 500 }}>
                        +{formatDelta(timeDeltaSec)}
                      </Typography>
                    </Box>
                  )}

                  {!isRecommended && timeDeltaSec < -60 && (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#f97316', ml: 'auto' }}>
                      <AccessTimeIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption" sx={{ color: '#f97316', fontSize: '0.72rem', fontWeight: 600 }}>
                        {formatDelta(Math.abs(timeDeltaSec))} faster
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};
