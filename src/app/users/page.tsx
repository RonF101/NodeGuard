"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import Box from "@mui/material/Box";
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
import Typography from "@mui/material/Typography";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { StatusChip } from "@/components/StatusChip";
import { users as userSeed } from "@/data/users";
import { authorizedFetch, DashboardRole } from "@/lib/auth";
import { Barangay, User, UserRole } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

type UserForm = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  agencyUnit: string;
  contactNumber: string;
  barangayId: string;
  organizationName: string;
};

const emptyForm: UserForm = {
  email: "",
  password: "",
  fullName: "",
  role: "LT-MDRRMO Operations",
  agencyUnit: "LT-MDRRMO",
  contactNumber: "",
  barangayId: "",
  organizationName: "LT-MDRRMO",
};

function toDbRole(role: UserRole): DashboardRole {
  if (role === "Barangay Administrator") return "barangay_admin";
  if (role === "Barangay Personnel") return "barangay_personnel";
  if (role === "LT-MDRRMO Administrator") return "mdrrmo_admin";
  if (role === "LT-MDRRMO Operations") return "mdrrmo_operations";
  if (role === "Field Responder") return "field_responder";
  if (role === "Super Admin") return "super_admin";
  if (role === "Admin") return "admin";
  return "personnel";
}

export default function UsersPage() {
  const pathname = usePathname();
  const barangayEnvironment = pathname.startsWith("/barangay");
  const [users, setUsers] = useState<User[]>(isSupabaseConfigured() ? [] : userSeed);
  const [editing, setEditing] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [barangays, setBarangays] = useState<Barangay[]>([]);

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
    void authorizedFetch("/api/barangays").then((response) => response.json()).then((result: { barangays?: Barangay[] }) => setBarangays(result.barangays ?? []));
    return () => window.clearTimeout(initialLoad);
  }, [loadUsers]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, role: barangayEnvironment ? "Barangay Personnel" : "LT-MDRRMO Operations", agencyUnit: barangayEnvironment ? "Barangay Emergency Desk" : "LT-MDRRMO" });
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
              barangayId: form.barangayId || undefined,
              organizationName: form.organizationName,
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
        subtitle={barangayEnvironment ? "Manage authorized local personnel and field responders for your barangay." : "Manage system-wide users, participating barangays, roles, and access status."}
        actions={<Button startIcon={<PersonAddIcon />} onClick={openCreate}>Add User</Button>}
      />
      <Card>
        <CardContent>
          <Stack spacing={1.5} sx={{ display: { xs: "flex", md: "none" } }}>
            {users.map((user) => (
              <Box component="article" key={user.id} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" color="secondary" sx={{ fontWeight: 900 }}>{user.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  </Box>
                  <StatusChip status={user.status} />
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1, mt: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Role</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{user.role}</Typography>
                    <Typography variant="caption" color="text.secondary">{user.organizationName ?? "Organization not assigned"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>Last Active</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{user.lastActive}</Typography>
                  </Box>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
                  <Button fullWidth variant="outlined" onClick={() => openEdit(user)}>Edit Role</Button>
                  <Button fullWidth color={user.status === "Active" ? "error" : "success"} variant="outlined" onClick={() => void toggleAccount(user)}>
                    {user.status === "Active" ? "Disable" : "Enable"}
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
          <TableContainer component={Paper} elevation={0} sx={{ display: { xs: "none", md: "block" } }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Organization</TableCell>
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
                    <TableCell>{user.organizationName ?? "Not assigned"}</TableCell>
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
            <TextField select label="Role" value={form.role} onChange={(event) => {
              const role = event.target.value as UserRole;
              setForm((current) => ({
                ...current,
                role,
                barangayId: role.startsWith("LT-MDRRMO") ? "" : current.barangayId,
                organizationName: role.startsWith("LT-MDRRMO") ? "LT-MDRRMO" : current.organizationName,
              }));
            }}>
              {(barangayEnvironment
                ? (["Barangay Personnel", "Field Responder"] as UserRole[])
                : (["Barangay Administrator", "Barangay Personnel", "LT-MDRRMO Administrator", "LT-MDRRMO Operations", "Field Responder"] as UserRole[])
              ).map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
            </TextField>
            {!editing && (
              <>
                <TextField label="Agency / Unit" value={form.agencyUnit} required onChange={(event) => setForm((current) => ({ ...current, agencyUnit: event.target.value }))} />
                {!barangayEnvironment && ["Barangay Administrator", "Barangay Personnel"].includes(form.role) && (
                  <TextField select label="Assigned Barangay" value={form.barangayId} required onChange={(event) => { const selected = barangays.find((item) => item.id === event.target.value); setForm((current) => ({ ...current, barangayId: event.target.value, organizationName: selected ? `Barangay ${selected.name}` : "" })); }}>
                    {barangays.map((item) => <MenuItem key={item.id} value={item.id}>Barangay {item.name}</MenuItem>)}
                  </TextField>
                )}
                {!barangayEnvironment && form.role === "Field Responder" && (
                  <TextField
                    select
                    label="Responder owner"
                    value={form.barangayId || "mdrrmo"}
                    required
                    onChange={(event) => {
                      const barangayId = event.target.value === "mdrrmo" ? "" : event.target.value;
                      const selected = barangays.find((item) => item.id === barangayId);
                      setForm((current) => ({
                        ...current,
                        barangayId,
                        organizationName: selected ? `Barangay ${selected.name}` : "LT-MDRRMO",
                      }));
                    }}
                  >
                    <MenuItem value="mdrrmo">LT-MDRRMO</MenuItem>
                    {barangays.map((item) => <MenuItem key={item.id} value={item.id}>Barangay {item.name}</MenuItem>)}
                  </TextField>
                )}
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
