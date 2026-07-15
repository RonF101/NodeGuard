"use client";

import { useCallback, useEffect, useState } from "react";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { users as userSeed } from "@/data/users";
import { authorizedFetch, DashboardRole } from "@/lib/auth";
import { User, UserRole } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

type UserForm = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  agencyUnit: string;
  contactNumber: string;
};

const emptyForm: UserForm = {
  email: "",
  password: "",
  fullName: "",
  role: "Personnel",
  agencyUnit: "LT-MDRRMO",
  contactNumber: "",
};

function toDbRole(role: UserRole): DashboardRole {
  if (role === "Super Admin") return "super_admin";
  if (role === "Admin") return "admin";
  return "personnel";
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(isSupabaseConfigured() ? [] : userSeed);
  const [editing, setEditing] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const response = await authorizedFetch("/api/users");
      const result = (await response.json()) as { ok: boolean; users?: User[]; reason?: string };
      if (!response.ok || !result.ok) throw new Error(result.reason ?? "Unable to load users.");
      if (result.users) setUsers(result.users);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load users.");
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadUsers(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadUsers]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({ ...emptyForm, email: user.email, fullName: user.name, role: user.role });
    setDialogOpen(true);
  };

  const saveUser = async () => {
    setIsSaving(true);
    const response = await authorizedFetch("/api/users", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editing
          ? { id: editing.id, role: toDbRole(form.role) }
          : {
              email: form.email,
              password: form.password,
              fullName: form.fullName,
              role: toDbRole(form.role),
              agencyUnit: form.agencyUnit,
              contactNumber: form.contactNumber,
            },
      ),
    });
    const result = (await response.json()) as { ok: boolean; reason?: string; user?: User };
    setIsSaving(false);
    if (!result.ok) {
      setMessage(result.reason ?? "User update failed.");
      return;
    }
    setDialogOpen(false);
    if (result.user) setUsers((current) => [...current, result.user!]);
    else if (editing) {
      setUsers((current) =>
        current.map((user) => (user.id === editing.id ? { ...user, role: form.role } : user)),
      );
    }
    setMessage(editing ? "User role updated." : "NodeGuard user created.");
    void loadUsers();
  };

  const toggleAccount = async (user: User) => {
    const nextActive = user.status !== "Active";
    const response = await authorizedFetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, isActive: nextActive }),
    });
    const result = (await response.json()) as { ok: boolean; reason?: string };
    if (!result.ok) {
      setMessage(result.reason ?? "Account update failed.");
      return;
    }
    setUsers((current) =>
      current.map((item) =>
        item.id === user.id ? { ...item, status: nextActive ? "Active" : "Disabled" } : item,
      ),
    );
    setMessage(nextActive ? "Account re-enabled." : "Account disabled.");
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Role Management"
        title="Users"
        subtitle="Create authorized accounts, assign least-privilege roles, and disable access when responsibilities change."
        actions={<Button startIcon={<PersonAddIcon />} onClick={openCreate}>Add User</Button>}
      />
      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell><StatusChip status={user.status} /></TableCell>
                    <TableCell>{user.lastActive}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                        <Button size="small" variant="outlined" onClick={() => openEdit(user)}>Edit Role</Button>
                        <Button size="small" color={user.status === "Active" ? "error" : "success"} variant="outlined" onClick={() => void toggleAccount(user)}>
                          {user.status === "Active" ? "Disable" : "Enable"}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit NodeGuard Role" : "Create NodeGuard User"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Full Name" value={form.fullName} disabled={Boolean(editing)} required onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            <TextField label="Email" type="email" value={form.email} disabled={Boolean(editing)} required onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            {!editing && (
              <TextField label="Temporary Password" type="password" value={form.password} required helperText="Use at least 8 characters and share it through an approved channel." onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            )}
            <TextField select label="Role" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}>
              {(["Personnel", "Admin", "Super Admin"] as UserRole[]).map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
            </TextField>
            {!editing && (
              <>
                <TextField label="Agency / Unit" value={form.agencyUnit} required onChange={(event) => setForm((current) => ({ ...current, agencyUnit: event.target.value }))} />
                <TextField label="Contact Number" value={form.contactNumber} onChange={(event) => setForm((current) => ({ ...current, contactNumber: event.target.value }))} />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => void saveUser()} disabled={isSaving || !form.fullName || !form.email || (!editing && form.password.length < 8)}>
            {isSaving ? "Saving..." : editing ? "Save Role" : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(message)} autoHideDuration={4500} onClose={() => setMessage("")} message={message} />
    </AppShell>
  );
}
