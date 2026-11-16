import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Autocomplete,
  Button,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Paper,
} from '@mui/material';
import NavigationIcon from '@mui/icons-material/Navigation';
import ScaleIcon from '@mui/icons-material/Scale';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StraightenIcon from '@mui/icons-material/Straighten';
import { geocodeCities } from '../../api/client';
import { GeocodeResultItem } from '../../types/trip';

interface TripFormProps {
  onSubmit: (params: {
    origin: string;
    destination: string;
    departureTime: string;
    weightLbs: number;
    intervalMiles: number;
  }) => void;
  isLoading: boolean;
}

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading }) => {
  const [origin, setOrigin] = useState<string>('Chicago, IL');
  const [destination, setDestination] = useState<string>('Indianapolis, IN');

  // Format current local time for datetime-local input
  const getNowFormatted = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [departureTime, setDepartureTime] = useState<string>(getNowFormatted());
  const [weightLbs, setWeightLbs] = useState<number>(35000);
  const [intervalMiles, setIntervalMiles] = useState<number>(25);

  // Autocomplete suggestions
  const [originOptions, setOriginOptions] = useState<string[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<string[]>([]);
  const [loadingOrigin, setLoadingOrigin] = useState<boolean>(false);
  const [loadingDest, setLoadingDest] = useState<boolean>(false);

  const originTimerRef = React.useRef<any>(null);
  const destTimerRef = React.useRef<any>(null);

  // Debounced search for Origin (only on user typing)
  const handleOriginSearch = useCallback((query: string) => {
    if (originTimerRef.current) clearTimeout(originTimerRef.current);
    if (!query || query.length < 2) return;

    originTimerRef.current = setTimeout(async () => {
      setLoadingOrigin(true);
      try {
        const results = await geocodeCities(query, 5);
        setOriginOptions(results.map((r: GeocodeResultItem) => r.display_name));
      } catch {
        // Ignore network errors in autocomplete
      } finally {
        setLoadingOrigin(false);
      }
    }, 350);
  }, []);

  // Debounced search for Destination (only on user typing)
  const handleDestSearch = useCallback((query: string) => {
    if (destTimerRef.current) clearTimeout(destTimerRef.current);
    if (!query || query.length < 2) return;

    destTimerRef.current = setTimeout(async () => {
      setLoadingDest(true);
      try {
        const results = await geocodeCities(query, 5);
        setDestinationOptions(results.map((r: GeocodeResultItem) => r.display_name));
      } catch {
        // Ignore network errors in autocomplete
      } finally {
        setLoadingDest(false);
      }
    }, 350);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;

    // Convert local datetime-local to ISO UTC
    const dateObj = new Date(departureTime);
    const isoString = dateObj.toISOString();

    onSubmit({
      origin: origin.trim(),
      destination: destination.trim(),
      departureTime: isoString,
      weightLbs,
      intervalMiles,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* 1. Origin Input */}
      <Autocomplete
        freeSolo
        options={originOptions}
        value={origin}
        onInputChange={(_, newInputValue, reason) => {
          setOrigin(newInputValue);
          if (reason === 'input') {
            handleOriginSearch(newInputValue);
          }
        }}
        loading={loadingOrigin}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Origin (City, State or GPS)"
            size="small"
            required
            fullWidth
            placeholder="e.g. Chicago, IL"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <NavigationIcon color="primary" sx={{ mr: 1, transform: 'rotate(45deg)', fontSize: 18 }} />
              ),
              endAdornment: (
                <>
                  {loadingOrigin ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />

      {/* 2. Destination Input */}
      <Autocomplete
        freeSolo
        options={destinationOptions}
        value={destination}
        onInputChange={(_, newInputValue, reason) => {
          setDestination(newInputValue);
          if (reason === 'input') {
            handleDestSearch(newInputValue);
          }
        }}
        loading={loadingDest}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Destination (City, State or GPS)"
            size="small"
            required
            fullWidth
            placeholder="e.g. Indianapolis, IN"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <NavigationIcon color="secondary" sx={{ mr: 1, transform: 'rotate(135deg)', fontSize: 18 }} />
              ),
              endAdornment: (
                <>
                  {loadingDest ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />

      {/* 3. Departure Date/Time */}
      <TextField
        label="Departure Date & Time"
        type="datetime-local"
        size="small"
        fullWidth
        value={departureTime}
        onChange={(e) => setDepartureTime(e.target.value)}
        InputLabelProps={{ shrink: true }}
        InputProps={{
          startAdornment: <AccessTimeIcon color="action" sx={{ mr: 1, fontSize: 18 }} />,
        }}
      />

      {/* 4. Cargo Load Weight */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScaleIcon fontSize="small" color="action" /> Cargo Load Weight:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {weightLbs.toLocaleString()} lbs
          </Typography>
        </Box>

        <Slider
          value={weightLbs}
          min={5000}
          max={80000}
          step={1000}
          valueLabelDisplay="auto"
          valueLabelFormat={(val) => `${val.toLocaleString()} lbs`}
          onChange={(_, val) => setWeightLbs(val as number)}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'text.secondary' }}>
          <span>5,000 lbs</span>
          <span>80,000 lbs</span>
        </Box>
      </Paper>

      {/* 5. Checkpoint Spacing */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StraightenIcon fontSize="small" /> Checkpoint Spacing:
        </Typography>
        <ToggleButtonGroup
          value={intervalMiles}
          exclusive
          size="small"
          color="primary"
          onChange={(_, val) => val !== null && setIntervalMiles(val)}
        >
          <ToggleButton value={10}>10 mi</ToggleButton>
          <ToggleButton value={25}>25 mi</ToggleButton>
          <ToggleButton value={50}>50 mi</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* 6. Submit Button */}
      <Button
        type="submit"
        variant="contained"
        color="primary"
        size="large"
        disabled={isLoading || !origin || !destination}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} color="inherit" />
            <span>Analyzing Weather Corridors...</span>
          </Box>
        ) : (
          'Find Safest Routes'
        )}
      </Button>
    </Box>
  );
};
