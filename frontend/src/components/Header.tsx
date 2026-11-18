import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface HeaderProps {
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ showBack, onBack }) => {
  return (
    <AppBar position="static" sx={{ padding: 0.5 }}>
      <Toolbar variant="dense" sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: onBack ? 'pointer' : 'default',
          }}
          onClick={onBack}
        >
          <LocalShippingIcon />
          <Typography variant="h6" component="div">
            Spotter Dispatch
          </Typography>
        </Box>

        {showBack && onBack && (
          <Button
            color="inherit"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            New Trip
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
};
