import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const RISK_LEVELS = [
  { label: 'Low', color: '#2e7d32', desc: '<25 mph wind / <0.10" rain' },
  { label: 'Moderate', color: '#ed6c02', desc: '25-34 mph wind / 0.10-0.25" rain' },
  { label: 'High', color: '#ef6c00', desc: '35-44 mph wind / 0.25-0.50" rain' },
  { label: 'Severe', color: '#d32f2f', desc: '45-54 mph wind / 0.50-1.00" rain' },
  { label: 'No Travel', color: '#7f1d1d', desc: '≥55 mph wind / >1.00" rain' },
];

export const MapLegend: React.FC = () => {
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.8,
        minWidth: 150,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
        Weather Risk Legend
      </Typography>

      {RISK_LEVELS.map((item) => (
        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: item.color,
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};
