import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Slider,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  FormControlLabel,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';
import LayersIcon from '@mui/icons-material/Layers';

export type HeatmapMetric = 'risk' | 'wind' | 'precip';

interface TimelineSliderProps {
  forecastHour: number;
  onHourChange: (hour: number | ((prev: number) => number)) => void;
  maxHours?: number;
  departureTimeIso?: string;
  heatmapMetric: HeatmapMetric;
  onMetricChange: (metric: HeatmapMetric) => void;
  showHeatmap: boolean;
  onToggleHeatmap: (show: boolean) => void;
  heatmapOpacity: number;
  onOpacityChange: (opacity: number) => void;
}

export const TimelineSlider: React.FC<TimelineSliderProps> = ({
  forecastHour,
  onHourChange,
  maxHours = 48,
  departureTimeIso,
  heatmapMetric,
  onMetricChange,
  showHeatmap,
  onToggleHeatmap,
  heatmapOpacity,
  onOpacityChange,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Play / Pause animation effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        onHourChange((prev) => (prev >= maxHours ? 0 : prev + 1));
      }, 700); // 700ms per forecast hour
    }
    return () => clearInterval(interval);
  }, [isPlaying, maxHours, onHourChange]);

  // Compute wall-clock time for the current forecast hour
  const getForecastTimeString = () => {
    if (!departureTimeIso) return `+${forecastHour} hours`;
    try {
      const depDate = new Date(departureTimeIso);
      depDate.setHours(depDate.getHours() + forecastHour);
      return depDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return `+${forecastHour} hours`;
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: '90%',
        maxWidth: 780,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 3,
        p: 2,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {/* Top Row: Controls & Time Label */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        {/* Play / Step Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Step Back 1 Hour">
            <span>
              <IconButton
                size="small"
                disabled={forecastHour <= 0}
                onClick={() => onHourChange(Math.max(0, forecastHour - 1))}
                sx={{ color: '#94a3b8' }}
              >
                <FastRewindIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={isPlaying ? 'Pause Animation' : 'Play Weather Evolution'}>
            <IconButton
              size="small"
              onClick={() => setIsPlaying(!isPlaying)}
              sx={{
                backgroundColor: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: isPlaying ? '#ef4444' : '#10b981',
                '&:hover': {
                  backgroundColor: isPlaying ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                },
              }}
            >
              {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Step Forward 1 Hour">
            <span>
              <IconButton
                size="small"
                disabled={forecastHour >= maxHours}
                onClick={() => onHourChange(Math.min(maxHours, forecastHour + 1))}
                sx={{ color: '#94a3b8' }}
              >
                <FastForwardIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Typography variant="body2" sx={{ ml: 1, fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
            +{forecastHour}h <span style={{ color: '#38bdf8', fontWeight: 500 }}>({getForecastTimeString()})</span>
          </Typography>
        </Box>

        {/* Heatmap Layer Toggles */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showHeatmap}
                onChange={(e) => onToggleHeatmap(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#10b981',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#10b981',
                  },
                }}
              />
            }
            label={
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LayersIcon sx={{ fontSize: 14 }} /> Heatmap
              </Typography>
            }
            sx={{ m: 0 }}
          />

          {showHeatmap && (
            <ToggleButtonGroup
              value={heatmapMetric}
              exclusive
              size="small"
              onChange={(_, val) => val !== null && onMetricChange(val)}
              sx={{
                height: 24,
                '& .MuiToggleButton-root': {
                  px: 0.8,
                  py: 0,
                  fontSize: '0.68rem',
                  color: '#94a3b8',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  '&.Mui-selected': {
                    color: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    fontWeight: 700,
                  },
                },
              }}
            >
              <ToggleButton value="risk">Risk</ToggleButton>
              <ToggleButton value="wind">Wind</ToggleButton>
              <ToggleButton value="precip">Precip</ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>
      </Box>

      {/* Main 0–48h Scrubber Slider */}
      <Box sx={{ px: 1 }}>
        <Slider
          value={forecastHour}
          min={0}
          max={maxHours}
          step={1}
          onChange={(_, val) => onHourChange(val as number)}
          sx={{
            color: '#38bdf8',
            height: 6,
            py: 1,
            '& .MuiSlider-thumb': {
              width: 16,
              height: 16,
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.8)',
            },
            '& .MuiSlider-rail': {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
            },
          }}
        />

        {/* Milestone Marks */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', mt: -0.5 }}>
          <span>0h (Departure)</span>
          <span>12h</span>
          <span>24h (+1 Day)</span>
          <span>36h</span>
          <span>48h (+2 Days)</span>
        </Box>
      </Box>

      {/* Optional Opacity Fine-tuning (visible when heatmap is on) */}
      {showHeatmap && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, pt: 0.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem', width: 90 }}>
            Layer Opacity:
          </Typography>
          <Slider
            value={heatmapOpacity}
            min={0.15}
            max={0.9}
            step={0.05}
            size="small"
            onChange={(_, val) => onOpacityChange(val as number)}
            sx={{
              color: '#94a3b8',
              height: 4,
              maxWidth: 150,
              '& .MuiSlider-thumb': { width: 12, height: 12 },
            }}
          />
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.68rem' }}>
            {Math.round(heatmapOpacity * 100)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
};
