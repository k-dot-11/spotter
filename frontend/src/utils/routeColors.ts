import { RouteSummary } from '../types/trip';

export const getRouteColor = (route: RouteSummary): string => {
  if (route.has_no_travel) return '#d32f2f'; // Red (No Travel)
  if (route.is_recommended) return '#2e7d32'; // Forest Green (Safest / Recommended)
  if (route.rank === 2) return '#1976d2'; // Blue (Option 2)
  if (route.rank === 3) return '#7b1fa2'; // Purple (Option 3)
  return '#0288d1';
};
