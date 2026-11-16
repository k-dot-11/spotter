import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CloudIcon from '@mui/icons-material/Cloud';

export const Header: React.FC = () => {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: '#090d16',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 1100,
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 52, px: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 2,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
            }}
          >
            <LocalShippingIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '0.04em' }}>
              SPOTTER <span style={{ color: '#10b981', fontWeight: 600 }}>ROUTING</span>
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>
              Weather-Aware Heavy Vehicle Dispatch
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            icon={<CloudIcon sx={{ fontSize: '14px !important', color: '#38bdf8 !important' }} />}
            label="0–48h Dynamic Weather"
            size="small"
            sx={{
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              color: '#38bdf8',
              fontSize: '0.72rem',
              height: 24,
            }}
          />
          <Chip
            label="API Active"
            size="small"
            sx={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              fontSize: '0.72rem',
              height: 24,
              '&::before': {
                content: '""',
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                marginRight: 0.8,
              },
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
