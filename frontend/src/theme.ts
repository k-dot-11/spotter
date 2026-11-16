import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#090d16',
      paper: '#111827',
    },
    primary: {
      main: '#10b981', // Emerald green
      light: '#34d399',
      dark: '#059669',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#38bdf8', // Sky blue
      light: '#7dd3fc',
      dark: '#0284c7',
    },
    warning: {
      main: '#f59e0b', // Amber
    },
    error: {
      main: '#ef4444', // Red
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    h6: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    subtitle1: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 500,
      color: '#94a3b8',
    },
    body2: {
      fontSize: '0.85rem',
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111827',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
  },
});
