"use client";

import { useState } from "react";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import MarkUnreadChatAltOutlinedIcon from "@mui/icons-material/MarkUnreadChatAltOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";

type IncidentActionsMenuProps = {
  incidentId: string;
  fieldNoteCount: number;
  unreadUpdates: boolean;
  urgentUpdates: boolean;
  onOpen: () => void;
  onViewUpdates: () => void;
};

export function IncidentActionsMenu({ incidentId, fieldNoteCount, unreadUpdates, urgentUpdates, onOpen, onViewUpdates }: IncidentActionsMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <Tooltip title={`Actions for ${incidentId}`}>
        <IconButton size="small" onClick={(event) => setAnchor(event.currentTarget)} aria-label={`Open actions for ${incidentId}`} aria-haspopup="menu" aria-expanded={Boolean(anchor)}>
          <Badge badgeContent={fieldNoteCount} color={urgentUpdates ? "error" : "primary"} invisible={!unreadUpdates || !fieldNoteCount}>
            <MoreVertOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={() => { close(); onOpen(); }}>
          <ListItemIcon><OpenInNewOutlinedIcon fontSize="small" /></ListItemIcon>
          Open incident
        </MenuItem>
        {fieldNoteCount > 0 && (
          <MenuItem onClick={() => { close(); onViewUpdates(); }}>
            <ListItemIcon><MarkUnreadChatAltOutlinedIcon color={urgentUpdates ? "error" : "inherit"} fontSize="small" /></ListItemIcon>
            View {fieldNoteCount} field update{fieldNoteCount === 1 ? "" : "s"}
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
