import { createTheme } from "@mui/material/styles";

export const nodeGuardSemanticColors = {
  critical: { main: "#C62828", soft: "#FDECEC", text: "#8E1B1B" },
  high: { main: "#D65A1F", soft: "#FFF0E6", text: "#8A3A13" },
  warning: { main: "#946200", soft: "#FFF4D6", text: "#6F4A00" },
  active: { main: "#155EEF", soft: "#EAF2FF", text: "#0B3A67" },
  success: { main: "#1F7A4D", soft: "#E7F4E8", text: "#155C39" },
  inactive: { main: "#52606D", soft: "#ECEFF1", text: "#36454F" },
  surface: { canvas: "#F4F7FA", paper: "#FFFFFF", border: "#D9E2EC" },
} as const;

export const nodeGuardRoleColors = {
  barangay: { primary: "#2F7D61", dark: "#123F32", soft: "#E8F3EE" },
  mdrrmo: { primary: "#155EEF", dark: "#0B3A67", soft: "#EAF2FF" },
} as const;

export const mdrrmoPalette = {
  readyWhite: "#FFFFFF",
  setBlue: nodeGuardRoleColors.mdrrmo.primary,
  setBlueDark: nodeGuardRoleColors.mdrrmo.dark,
  setBlueSoft: nodeGuardRoleColors.mdrrmo.soft,
  goRed: nodeGuardSemanticColors.critical.main,
  goRedSoft: nodeGuardSemanticColors.critical.soft,
  navy: "#0B1F33",
  white: "#FFFFFF",
  softGray: nodeGuardSemanticColors.surface.canvas,
  border: nodeGuardSemanticColors.surface.border,
  muted: nodeGuardSemanticColors.inactive.main,
  successGreen: nodeGuardSemanticColors.success.main,
  warningAmber: nodeGuardSemanticColors.warning.main,
  slate: "#172B3A",
  // Compatibility aliases while legacy feature views migrate to the shared system.
  orange: nodeGuardRoleColors.mdrrmo.primary,
  cream: nodeGuardRoleColors.mdrrmo.soft,
  green: nodeGuardRoleColors.mdrrmo.primary,
  darkGreen: nodeGuardRoleColors.mdrrmo.dark,
  alertRed: nodeGuardSemanticColors.critical.main,
};

function createOperationalTheme(identity: typeof nodeGuardRoleColors.barangay | typeof nodeGuardRoleColors.mdrrmo) {
  return createTheme({
    spacing: 8,
    palette: {
      primary: {
        main: identity.primary,
        dark: identity.dark,
        light: identity.soft,
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: identity.dark,
        contrastText: "#FFFFFF",
      },
      success: { main: nodeGuardSemanticColors.success.main },
      warning: { main: nodeGuardSemanticColors.warning.main },
      error: { main: nodeGuardSemanticColors.critical.main },
      info: { main: nodeGuardSemanticColors.active.main },
      background: {
        default: nodeGuardSemanticColors.surface.canvas,
        paper: nodeGuardSemanticColors.surface.paper,
      },
      divider: nodeGuardSemanticColors.surface.border,
      text: {
        primary: "#172B3A",
        secondary: "#52606D",
      },
    },
    typography: {
      fontFamily: "Arial, Helvetica, sans-serif",
      h1: { fontWeight: 800, fontSize: "2rem", lineHeight: 1.15 },
      h2: { fontWeight: 800, fontSize: "1.875rem", lineHeight: 1.18 },
      h3: { fontWeight: 800, fontSize: "1.75rem", lineHeight: 1.2 },
      h4: { fontWeight: 800, fontSize: "1.75rem", lineHeight: 1.22 },
      h5: { fontWeight: 750, fontSize: "1.25rem", lineHeight: 1.3 },
      h6: { fontWeight: 750, fontSize: "1rem", lineHeight: 1.35 },
      body1: { fontSize: "1rem", lineHeight: 1.55 },
      body2: { fontSize: "0.875rem", lineHeight: 1.5 },
      caption: { fontSize: "0.75rem", lineHeight: 1.45 },
      button: { fontWeight: 700, textTransform: "none" },
      overline: { fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em" },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":focus-visible": {
            outline: `3px solid ${identity.primary}`,
            outlineOffset: "2px",
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${nodeGuardSemanticColors.surface.border}`,
            boxShadow: "0 2px 10px rgba(11, 31, 51, 0.06)",
            backgroundImage: "none",
          },
        },
      },
      MuiCardActionArea: {
        styleOverrides: {
          root: {
            "&:focus-visible": { outline: `3px solid ${identity.primary}`, outlineOffset: -3 },
          },
        },
      },
      MuiButton: {
        defaultProps: { variant: "contained" },
        styleOverrides: {
          root: {
            borderRadius: 8,
            minHeight: 44,
            boxShadow: "none",
            "&:hover": { boxShadow: "0 2px 6px rgba(11, 31, 51, 0.14)" },
            "&:focus-visible": { outline: `3px solid ${identity.dark}`, outlineOffset: 2 },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            minWidth: 44,
            minHeight: 44,
            "&:focus-visible": { outline: `3px solid ${identity.primary}`, outlineOffset: 2 },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 20,
            "&:last-child": { paddingBottom: 20 },
            "@media (max-width:599.95px)": {
              padding: 16,
              "&:last-child": { paddingBottom: 16 },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            maxHeight: "calc(100% - 24px)",
            margin: 12,
            "@media (max-width:599.95px)": {
              width: "calc(100% - 24px)",
              maxWidth: "calc(100% - 24px)",
            },
          },
        },
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
              "& > :not(style)": { width: "100%", margin: 0 },
            },
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            maxWidth: "100%",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { paddingTop: 12, paddingBottom: 12, fontSize: "0.8125rem" },
          head: {
            minHeight: 52,
            backgroundColor: "#F8FAFC",
            color: identity.dark,
            fontWeight: 800,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { "&.MuiTableRow-hover:hover": { backgroundColor: identity.soft } },
        },
      },
      MuiOutlinedInput: { styleOverrides: { root: { minHeight: 44 } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
      MuiTooltip: { defaultProps: { arrow: true, enterDelay: 450 } },
    },
  });
}

export const barangayTheme = createOperationalTheme(nodeGuardRoleColors.barangay);
export const mdrrmoTheme = createOperationalTheme(nodeGuardRoleColors.mdrrmo);
export const theme = mdrrmoTheme;
