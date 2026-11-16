import React, { useState, useEffect, useMemo } from 'react';
import { Box, ThemeProvider, CssBaseline, Alert, Snackbar } from '@mui/material';
import { theme } from './theme';
import { Header } from './components/Header';
import { TripForm } from './components/Sidebar/TripForm';
import { RouteCardList } from './components/Sidebar/RouteCardList';
import { RouteMap } from './components/Map/RouteMap';
import { HeatmapMetric } from './components/Map/TimelineSlider';
import { planTrip } from './api/client';
import { TripPlanResponse } from './types/trip';

export const App: React.FC = () => {
  const [tripData, setTripData] = useState<TripPlanResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [forecastHour, setForecastHour] = useState<number>(0);
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetric>('risk');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.6);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const routes = useMemo(() => tripData?.routes || [], [tripData]);

  const handleTripSubmit = async (params: {
    origin: string;
    destination: string;
    departureTime: string;
    weightLbs: number;
    intervalMiles: number;
  }) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await planTrip({
        origin: params.origin,
        destination: params.destination,
        departure_time: params.departureTime,
        weight_lbs: params.weightLbs,
        sampling_interval_miles: params.intervalMiles,
      });
      setTripData(data);
      setSelectedRouteId(data.recommended_route_id || data.routes[0]?.route_id || '');
      setForecastHour(0);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze route. Please verify your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial demo route on first load so user immediately sees populated routes & heatmap
  useEffect(() => {
    handleTripSubmit({
      origin: 'Chicago, IL',
      destination: 'Indianapolis, IN',
      departureTime: new Date().toISOString(),
      weightLbs: 35000,
      intervalMiles: 25,
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        {/* Top Header */}
        <Header />

        {/* Main Cockpit Split Layout: Left Sidebar + Dedicated Fixed Right Map Container */}
        <Box sx={{ display: 'flex', flex: 1, height: 'calc(100vh - 48px)', width: '100vw', overflow: 'hidden' }}>
          {/* Left Sidebar: Fixed Width Container (440px) */}
          <Box
            component="aside"
            sx={{
              width: 440,
              minWidth: 440,
              maxWidth: 440,
              height: '100%',
              overflowY: 'auto',
              p: 2,
              bgcolor: 'background.paper',
              borderRight: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              flexShrink: 0,
              zIndex: 10,
            }}
          >
            {/* Input Form */}
            <TripForm onSubmit={handleTripSubmit} isLoading={isLoading} />

            {/* Evaluated Route Cards */}
            {tripData && (
              <RouteCardList
                routes={routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={setSelectedRouteId}
              />
            )}
          </Box>

          {/* Right Area: Dedicated Fixed Map Container */}
          <Box
            component="main"
            sx={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              bgcolor: '#e0e0e0',
            }}
          >
            <RouteMap
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
              corridorHeatmap={tripData?.corridor_heatmap}
              departureTimeIso={tripData?.departure_time}
              forecastHour={forecastHour}
              onHourChange={setForecastHour}
              heatmapMetric={heatmapMetric}
              onMetricChange={setHeatmapMetric}
              showHeatmap={showHeatmap}
              onToggleHeatmap={setShowHeatmap}
              heatmapOpacity={heatmapOpacity}
              onOpacityChange={setHeatmapOpacity}
            />
          </Box>
        </Box>

        {/* Error Snackbar */}
        <Snackbar
          open={!!errorMessage}
          autoHideDuration={6000}
          onClose={() => setErrorMessage(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ width: '100%' }}>
            {errorMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};
