import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CloudIcon from '@mui/icons-material/Cloud';

export const Header: React.FC = () => {
  return (
    <AppBar position="static">
      <Toolbar variant="dense" sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LocalShippingIcon />
          <Typography variant="h6" component="div">
            Spotter | Weather-Aware Heavy Vehicle Dispatch
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<CloudIcon />}
            label="0–48h Weather Forecast"
            size="small"
            sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'inherit' }}
          />
          <Chip
            label="API Active"
            size="small"
            color="success"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};
