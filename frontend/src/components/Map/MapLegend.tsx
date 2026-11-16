import React from 'react';
import { Box, Typography } from '@mui/material';

const RISK_LEVELS = [
  { label: 'Low', color: '#22c55e', desc: '<25 mph wind / <0.10" rain' },
  { label: 'Moderate', color: '#eab308', desc: '25-34 mph wind / 0.10-0.25" rain' },
  { label: 'High', color: '#f97316', desc: '35-44 mph wind / 0.25-0.50" rain' },
  { label: 'Severe', color: '#ef4444', desc: '45-54 mph wind / 0.50-1.00" rain' },
  { label: 'No Travel', color: '#7f1d1d', desc: '≥55 mph wind / >1.00" rain' },
];

export const MapLegend: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        p: 1.2,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.8,
        minWidth: 160,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Weather Risk Legend
      </Typography>

      {RISK_LEVELS.map((item) => (
        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: item.color,
              boxShadow: `0 0 6px ${item.color}80`,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" sx={{ color: '#f1f5f9', fontWeight: 500, fontSize: '0.72rem' }}>
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};
