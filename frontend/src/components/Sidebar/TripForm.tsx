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
  Chip,
  Alert,
  Paper,
} from '@mui/material';
import NavigationIcon from '@mui/icons-material/Navigation';
import ScaleIcon from '@mui/icons-material/Scale';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StraightenIcon from '@mui/icons-material/Straighten';
import FlashOnIcon from '@mui/icons-material/FlashOn';
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

  const applyPreset = (orig: string, dest: string, wt: number) => {
    setOrigin(orig);
    setDestination(dest);
    setWeightLbs(wt);
  };

  // Weight escalation warning indicators based on PDF rules
  const isHighWeightEscalation = weightLbs > 40000;
  const isModerateWeightEscalation = weightLbs > 30000;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Quick Presets */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FlashOnIcon fontSize="small" color="primary" /> Quick Corridors:
        </Typography>
        <Chip
          label="Chicago → Indy"
          size="small"
          onClick={() => applyPreset('Chicago, IL', 'Indianapolis, IN', 35000)}
          clickable
        />
        <Chip
          label="Dallas → KC (Heavy)"
          size="small"
          onClick={() => applyPreset('Dallas, TX', 'Kansas City, MO', 44000)}
          clickable
        />
      </Box>

      {/* Origin Input */}
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

      {/* Destination Input */}
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

      {/* Departure Date/Time */}
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

      {/* Load Weight */}
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
          color={isHighWeightEscalation ? 'error' : isModerateWeightEscalation ? 'warning' : 'primary'}
          onChange={(_, val) => setWeightLbs(val as number)}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'text.secondary' }}>
          <span>Empty (5k)</span>
          <span>30k (Rule Threshold)</span>
          <span>40k (Heavy Threshold)</span>
          <span>80k (Max)</span>
        </Box>

        {isHighWeightEscalation && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Weight &gt; 40,000 lbs: 35–44 mph winds escalate to <strong>Severe</strong>.
          </Alert>
        )}
        {!isHighWeightEscalation && isModerateWeightEscalation && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            Weight &gt; 30,000 lbs: 45–54 mph winds escalate to <strong>No Travel</strong>.
          </Alert>
        )}
      </Paper>

      {/* Sampling Interval Selector */}
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

      {/* Submit Button */}
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
