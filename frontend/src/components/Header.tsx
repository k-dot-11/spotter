import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import React from 'react';

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
      </Toolbar>
    </AppBar>
  );
};
