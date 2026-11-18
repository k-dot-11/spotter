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
  Paper,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';
import LayersIcon from '@mui/icons-material/Layers';

export type HeatmapMetric = 'risk' | 'wind' | 'rain' | 'snow';

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
      }, 700);
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
    <Paper
      elevation={6}
      sx={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: 'calc(100% - 48px)',
        maxWidth: 720,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {/* Top Row: Controls & Time Label */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        {/* Play / Step Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Jump to Start (0h)">
            <IconButton size="small" onClick={() => onHourChange(0)}>
              <FastRewindIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={isPlaying ? 'Pause Animation' : 'Play Forecast Timeline'}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Jump to End (+48h)">
            <IconButton size="small" onClick={() => onHourChange(maxHours)}>
              <FastForwardIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, ml: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.light', whiteSpace: 'nowrap' }}>
              +{forecastHour}h
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
              ({getForecastTimeString()})
            </Typography>
          </Box>
        </Box>

        {/* Heatmap Layer Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                color="primary"
                checked={showHeatmap}
                onChange={(e) => onToggleHeatmap(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}>
                <LayersIcon fontSize="small" /> Heatmap
              </Typography>
            }
            sx={{ m: 0 }}
          />

          {showHeatmap && (
            <ToggleButtonGroup
              value={heatmapMetric}
              exclusive
              size="small"
              color="primary"
              onChange={(_, val) => val && onMetricChange(val)}
              sx={{
                '& .MuiToggleButton-root': {
                  px: 1.25,
                  py: 0.25,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                },
              }}
            >
              <ToggleButton value="risk">Risk</ToggleButton>
              <ToggleButton value="wind">Wind</ToggleButton>
              <ToggleButton value="rain">Rain</ToggleButton>
              <ToggleButton value="snow">Snow</ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>
      </Box>

      {/* Forecast Scrubber Slider */}
      <Box sx={{ px: 3.5, pt: 0.5, pb: 0.5 }}>
        <Slider
          value={forecastHour}
          min={0}
          max={maxHours}
          step={1}
          valueLabelDisplay="auto"
          valueLabelFormat={(val) => `+${val}h`}
          onChange={(_, val) => {
            setIsPlaying(false);
            onHourChange(val as number);
          }}
          marks={[
            { value: 0, label: '0h (Departure)' },
            { value: 12, label: '12h' },
            { value: 24, label: '24h (+1d)' },
            { value: 36, label: '36h' },
            { value: 48, label: '48h (+2d)' },
          ]}
          sx={{
            py: 1,
            '& .MuiSlider-markLabel[data-index="0"]': {
              transform: 'translateX(0)',
            },
            '& .MuiSlider-markLabel[data-index="4"]': {
              transform: 'translateX(-100%)',
            },
            '& .MuiSlider-markLabel': {
              fontSize: '0.72rem',
              color: 'text.secondary',
              fontWeight: 500,
              mt: 0.5,
            },
            '& .MuiSlider-mark': {
              height: 4,
              width: 4,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.35)',
            },
            '& .MuiSlider-markActive': {
              bgcolor: 'background.paper',
            },
          }}
        />
      </Box>

      {/* Heatmap Opacity Scrubber */}
      {showHeatmap && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 3.5, pt: 0.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            Heatmap Opacity:
          </Typography>
          <Slider
            size="small"
            value={heatmapOpacity}
            min={0.1}
            max={1.0}
            step={0.05}
            valueLabelDisplay="auto"
            valueLabelFormat={(val) => `${Math.round(val * 100)}%`}
            onChange={(_, val) => onOpacityChange(val as number)}
            sx={{ width: 140 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 32, fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(heatmapOpacity * 100)}%
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
