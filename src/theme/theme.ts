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
    h1: { fontWeight: 800, fontSize: "clamp(2rem, 7vw, 3.5rem)", lineHeight: 1.08 },
    h2: { fontWeight: 800, fontSize: "clamp(1.8rem, 6vw, 3rem)", lineHeight: 1.1 },
    h3: { fontWeight: 800, fontSize: "clamp(1.65rem, 5vw, 2.5rem)", lineHeight: 1.14 },
    h4: { fontWeight: 800, fontSize: "clamp(1.45rem, 4.5vw, 2rem)", lineHeight: 1.18 },
    h5: { fontWeight: 800, fontSize: "clamp(1.2rem, 3.5vw, 1.5rem)", lineHeight: 1.25 },
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
          boxShadow: "0 2px 8px rgba(11, 31, 51, 0.06)"
        }
      }
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          "&:focus-visible": {
            outline: `3px solid ${mdrrmoPalette.setBlue}`,
            outlineOffset: -3
          }
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
          minHeight: 48,
          boxShadow: "none",
          "&:hover": { boxShadow: "0 2px 6px rgba(11, 31, 51, 0.14)" },
          "&:focus-visible": {
            outline: `3px solid ${mdrrmoPalette.setBlueDark}`,
            outlineOffset: 2
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 48,
          minHeight: 48,
          "&:focus-visible": {
            outline: `3px solid ${mdrrmoPalette.setBlue}`,
            outlineOffset: 2
          }
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 24,
          "&:last-child": { paddingBottom: 24 },
          "@media (max-width:599.95px)": {
            padding: 16,
            "&:last-child": { paddingBottom: 16 }
          }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          maxHeight: "calc(100% - 24px)",
          margin: 12,
          "@media (max-width:599.95px)": {
            width: "calc(100% - 24px)",
            maxWidth: "calc(100% - 24px)"
          }
        }
      }
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          gap: 8,
          flexWrap: "wrap",
          padding: 16,
          "@media (max-width:599.95px)": {
            alignItems: "stretch",
            flexDirection: "column-reverse",
            "& > :not(style)": {
              width: "100%",
              margin: 0
            }
          }
        }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          maxWidth: "100%",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch"
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: 12,
          paddingBottom: 12
        },
        head: {
          minHeight: 52,
          backgroundColor: "#F8FAFC",
          color: mdrrmoPalette.setBlueDark,
          fontWeight: 900
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 48
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
