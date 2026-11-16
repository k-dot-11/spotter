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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <FlashOnIcon sx={{ fontSize: 13, color: '#f59e0b' }} /> Quick Corridors:
        </Typography>
        <Chip
          label="Chicago → Indy"
          size="small"
          onClick={() => applyPreset('Chicago, IL', 'Indianapolis, IN', 35000)}
          sx={{ fontSize: '0.7rem', height: 22, cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.06)' }}
        />
        <Chip
          label="Dallas → KC (Heavy)"
          size="small"
          onClick={() => applyPreset('Dallas, TX', 'Kansas City, MO', 44000)}
          sx={{ fontSize: '0.7rem', height: 22, cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.06)' }}
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
                <NavigationIcon sx={{ fontSize: 16, color: '#10b981', mr: 1, transform: 'rotate(45deg)' }} />
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
                <NavigationIcon sx={{ fontSize: 16, color: '#ef4444', mr: 1, transform: 'rotate(135deg)' }} />
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
          startAdornment: <AccessTimeIcon sx={{ fontSize: 16, color: '#38bdf8', mr: 1 }} />,
        }}
      />

      {/* Load Weight */}
      <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <ScaleIcon sx={{ fontSize: 16, color: '#f59e0b' }} /> Cargo Load Weight:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc' }}>
            {weightLbs.toLocaleString()} lbs
          </Typography>
        </Box>

        <Slider
          value={weightLbs}
          min={5000}
          max={80000}
          step={1000}
          onChange={(_, val) => setWeightLbs(val as number)}
          sx={{
            color: isHighWeightEscalation ? '#ef4444' : isModerateWeightEscalation ? '#f59e0b' : '#10b981',
            height: 6,
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
            },
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
          <span>Empty (5k)</span>
          <span style={{ color: weightLbs > 30000 ? '#f59e0b' : 'inherit' }}>30k (Rule Threshold)</span>
          <span style={{ color: weightLbs > 40000 ? '#ef4444' : 'inherit' }}>40k (Heavy Threshold)</span>
          <span>80k (Max Legal)</span>
        </Box>

        {isHighWeightEscalation && (
          <Alert severity="warning" sx={{ mt: 1.2, py: 0.2, px: 1, fontSize: '0.72rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
            Weight &gt; 40,000 lbs: 35–44 mph winds escalate to <strong>Severe</strong>.
          </Alert>
        )}
        {!isHighWeightEscalation && isModerateWeightEscalation && (
          <Alert severity="info" sx={{ mt: 1.2, py: 0.2, px: 1, fontSize: '0.72rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#fcd34d' }}>
            Weight &gt; 30,000 lbs: 45–54 mph winds escalate to <strong>No Travel</strong>.
          </Alert>
        )}
      </Box>

      {/* Sampling Interval Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#94a3b8' }}>
          <StraightenIcon sx={{ fontSize: 16 }} /> Checkpoint Spacing:
        </Typography>
        <ToggleButtonGroup
          value={intervalMiles}
          exclusive
          size="small"
          onChange={(_, val) => val !== null && setIntervalMiles(val)}
          sx={{
            height: 30,
            '& .MuiToggleButton-root': {
              px: 1.2,
              py: 0.2,
              fontSize: '0.75rem',
              color: '#94a3b8',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              '&.Mui-selected': {
                color: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                fontWeight: 700,
              },
            },
          }}
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
        disabled={isLoading || !origin || !destination}
        sx={{
          py: 1.2,
          fontSize: '0.92rem',
          backgroundColor: '#10b981',
          '&:hover': { backgroundColor: '#059669' },
          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} color="inherit" />
            <span>Analyzing Weather Corridors...</span>
          </Box>
        ) : (
          'Find Safest Routes'
        )}
      </Button>
    </Box>
  );
};
