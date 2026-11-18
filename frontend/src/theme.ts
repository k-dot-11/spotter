import { createTheme } from '@mui/material/styles';

/**
 * Centralized MUI Theme based on Color Hunt palette:
 * - #0F0F0F: Dark canvas / default background
 * - #232D3F: Deep dark slate / paper & card surface
 * - #005B41: Deep forest jade / secondary & primary dark
 * - #008170: Bright emerald teal / primary main accent
 */
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#008170',
      dark: '#005B41',
      light: '#00b89f',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#005B41',
      light: '#008170',
      dark: '#003d2b',
      contrastText: '#ffffff',
    },
    background: {
      default: '#0F0F0F',
      paper: '#232D3F',
    },
    text: {
      primary: '#ffffff',
      secondary: '#94a3b8',
    },
    divider: 'rgba(255, 255, 255, 0.1)',
    success: {
      main: '#008170',
      light: '#00b89f',
      dark: '#005B41',
    },
    error: {
      main: '#ef4444',
      dark: '#b91c1c',
      light: '#f87171',
    },
    warning: {
      main: '#f59e0b',
    },
    action: {
      selected: 'rgba(0, 129, 112, 0.16)',
      hover: 'rgba(255, 255, 255, 0.05)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#232D3F',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#232D3F',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#232D3F',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 6,
        },
        containedPrimary: {
          backgroundColor: '#008170',
          '&:hover': {
            backgroundColor: '#005B41',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});
