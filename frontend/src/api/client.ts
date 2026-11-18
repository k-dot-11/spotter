import { GeocodeResultItem, TripPlanResponse } from '../types/trip';

// Robust normalization for local development and production deployments (Render, Vercel, Netlify)
const normalizeApiBase = (raw?: string): string => {
  if (!raw || raw === '/api') return '/api';
  let url = raw.trim();

  // If Render injected an internal service name without TLD (e.g. "spotter-backend-7t78")
  const hostPart = url.replace(/^https?:\/\//, '').split('/')[0];
  if (hostPart && !hostPart.includes('.') && !hostPart.includes(':') && hostPart !== 'localhost') {
    url = url.replace(hostPart, `${hostPart}.onrender.com`);
  }

  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    url = `https://${url}`;
  }
  return url.endsWith('/api') ? url : `${url.replace(/\/+$/, '')}/api`;
};

const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

export interface TripPlanPayload {
  origin: string;
  destination: string;
  departure_time?: string;
  weight_lbs: number;
  sampling_interval_miles?: number;
}

export async function geocodeCities(query: string, limit: number = 5): Promise<GeocodeResultItem[]> {
  if (!query || query.trim().length < 2) return [];

  const response = await fetch(`${API_BASE}/geocode/?q=${encodeURIComponent(query.trim())}&limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

export async function planTrip(payload: TripPlanPayload): Promise<TripPlanResponse> {
  const response = await fetch(`${API_BASE}/trips/plan/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data.error || (data.details ? JSON.stringify(data.details) : 'Failed to analyze route');
    throw new Error(errorMsg);
  }

  return data as TripPlanResponse;
}
