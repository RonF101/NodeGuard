import { User } from "@/types";

export const users: User[] = [
  {
    id: "USR-001",
    name: "Maria Santos",
    email: "m.santos@ltdrrmo.local",
    role: "Super Admin",
    status: "Active",
    lastActive: "2026-07-06 08:50"
  },
  {
    id: "USR-002",
    name: "Joel Bautista",
    email: "j.bautista@ltdrrmo.local",
    role: "Admin",
    status: "Active",
    lastActive: "2026-07-06 08:21"
  },
  {
    id: "USR-003",
    name: "Anna Rivera",
    email: "a.rivera@ltdrrmo.local",
    role: "Personnel",
    status: "Active",
    lastActive: "2026-07-06 07:58"
  },
  {
    id: "USR-004",
    name: "Mark Dacumos",
    email: "m.dacumos@ltdrrmo.local",
    role: "Personnel",
    status: "Disabled",
    lastActive: "2026-06-30 17:12"
  }
];
