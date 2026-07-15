import { createTheme } from "@mui/material/styles";

export const mdrrmoPalette = {
  readyWhite: "#FFFFFF",
  setBlue: "#155EEF",
  setBlueDark: "#0B3A67",
  setBlueSoft: "#EAF2FF",
  goRed: "#C62828",
  goRedSoft: "#FDECEC",
  navy: "#0B1F33",
  white: "#FFFFFF",
  softGray: "#F4F7FA",
  border: "#D9E2EC",
  muted: "#52606D",
  successGreen: "#1F7A4D",
  warningAmber: "#946200",
  slate: "#172B3A",
  // Compatibility aliases while legacy feature views migrate to the shared system.
  orange: "#155EEF",
  cream: "#EAF2FF",
  green: "#155EEF",
  darkGreen: "#0B3A67",
  alertRed: "#C62828"
};

export const theme = createTheme({
  palette: {
    primary: {
      main: mdrrmoPalette.setBlue,
      contrastText: mdrrmoPalette.white
    },
    secondary: {
      main: mdrrmoPalette.setBlueDark,
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
          border: `1px solid ${mdrrmoPalette.border}`,
          boxShadow: "0 8px 22px rgba(11, 31, 51, 0.07)"
        }
      }
    },
    MuiButton: {
      defaultProps: {
        variant: "contained"
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 44
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
