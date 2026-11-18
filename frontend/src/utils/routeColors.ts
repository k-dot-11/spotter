import { RouteSummary } from '../types/trip';

export const getRouteColor = (route: RouteSummary): string => {
  if (route.has_no_travel) return '#ef4444'; // Red (No Travel)
  if (route.is_recommended) return '#008170'; // Emerald Teal (Safest / Recommended)
  if (route.rank === 2) return '#38bdf8'; // Sky Blue (Option 2)
  if (route.rank === 3) return '#a855f7'; // Purple (Option 3)
  return '#00b89f';
};
