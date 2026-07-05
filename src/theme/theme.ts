import { createTheme } from "@mui/material/styles";

export const mdrrmoPalette = {
  orange: "#F47F35",
  cream: "#F7D6C2",
  green: "#3E7058",
  darkGreen: "#244D3A",
  white: "#FFFFFF",
  softGray: "#F5F6F7",
  alertRed: "#D32F2F",
  warningAmber: "#F9A825",
  successGreen: "#2E7D32",
  slate: "#23342C"
};

export const theme = createTheme({
  palette: {
    primary: {
      main: mdrrmoPalette.orange,
      contrastText: mdrrmoPalette.white
    },
    secondary: {
      main: mdrrmoPalette.darkGreen,
      contrastText: mdrrmoPalette.white
    },
    success: {
      main: mdrrmoPalette.successGreen
    },
    warning: {
      main: mdrrmoPalette.warningAmber
    },
    error: {
      main: mdrrmoPalette.alertRed
    },
    background: {
      default: mdrrmoPalette.softGray,
      paper: mdrrmoPalette.white
    },
    text: {
      primary: mdrrmoPalette.slate,
      secondary: "#5F6F66"
    }
  },
  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 800 },
    h4: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 800 },
    button: { fontWeight: 700, textTransform: "none" }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(36, 77, 58, 0.08)",
          boxShadow: "0 10px 24px rgba(36, 77, 58, 0.08)"
        }
      }
    },
    MuiButton: {
      defaultProps: {
        variant: "contained"
      },
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700
        }
      }
    }
  }
});
