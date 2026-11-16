export type RiskLevelName = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'NO_TRAVEL';

export interface WeatherCondition {
  wind_mph: number;
  rain_in_per_hr: number;
  snow_in_per_hr: number;
}

export interface CheckpointRisk {
  overall_risk: RiskLevelName;
  risk_score: number;
  risk_label: string;
  risk_color: string;
  wind_risk: RiskLevelName;
  rain_risk: RiskLevelName;
  snow_risk: RiskLevelName;
  primary_hazard: string;
  load_escalation_applied: boolean;
  escalation_reason: string | null;
  is_safe: boolean;
}

export interface CheckpointData {
  index: number;
  lat: number;
  lon: number;
  distance_from_start_miles: number;
  segment_miles: number;
  eta_iso: string;
  elapsed_seconds: number;
  weather: WeatherCondition;
  risk: CheckpointRisk;
  risk_score: number;
}

export interface RouteSummary {
  route_id: string;
  route_name: string;
  total_distance_miles: number;
  duration_seconds: number;
  duration_formatted: string;
  low_miles: number;
  moderate_miles: number;
  high_miles: number;
  severe_miles: number;
  no_travel_miles: number;
  average_risk: number;
  max_risk_level: RiskLevelName;
  has_no_travel: boolean;
  is_safe_to_travel: boolean;
  is_recommended: boolean;
  rank: number;
  recommendation_reason: string;
  geometry_coordinates: [number, number][]; // [lon, lat]
  checkpoints: CheckpointData[];
}

export interface CorridorHeatmapPoint {
  lat: number;
  lon: number;
  risk_timeline: number[];    // 0..48 hours (risk scores 1..5)
  wind_timeline: number[];    // 0..48 hours (mph)
  precip_timeline: number[];  // 0..48 hours (in/hr)
}

export interface CorridorHeatmapTimeline {
  start_time_iso: string;
  max_forecast_hours: number;
  points: CorridorHeatmapPoint[];
}

export interface LocationInfo {
  lat: number;
  lon: number;
  name: string;
}

export interface TripPlanResponse {
  origin: LocationInfo;
  destination: LocationInfo;
  departure_time: string;
  weight_lbs: number;
  sampling_interval_miles: number;
  recommended_route_id: string;
  routes: RouteSummary[];
  corridor_heatmap: CorridorHeatmapTimeline;
}

export interface GeocodeResultItem {
  lat: number;
  lon: number;
  display_name: string;
  place_id?: string;
}
