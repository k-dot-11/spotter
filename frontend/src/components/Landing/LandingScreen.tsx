import React from 'react';
import { Box, Container, Paper, Typography, Chip } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CloudIcon from '@mui/icons-material/Cloud';
import ShieldIcon from '@mui/icons-material/Shield';
import { TripForm, TripFormValues } from '../Sidebar/TripForm';

interface LandingScreenProps {
  initialValues?: Partial<TripFormValues>;
  onSubmit: (params: TripFormValues) => void;
  isLoading: boolean;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  initialValues,
  onSubmit,
  isLoading,
}) => {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 48px)',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        {/* Brand Hero Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LocalShippingIcon color="primary" sx={{ fontSize: 36 }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Spotter Dispatch
            </Typography>
          </Box>
          <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
            Weather-Aware Heavy Vehicle Routing & Risk Analysis
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1.5 }}>
            <Chip
              icon={<ShieldIcon fontSize="small" />}
              label="Safety-First Optimization"
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<CloudIcon fontSize="small" />}
              label="48-Hour Weather Forecasts"
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Centralized Form Box */}
        <Paper
          elevation={3}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: 2,
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
            Plan a Route
          </Typography>
          <TripForm
            initialValues={initialValues}
            onSubmit={onSubmit}
            isLoading={isLoading}
          />
        </Paper>
      </Container>
    </Box>
  );
};
