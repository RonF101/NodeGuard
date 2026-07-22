import Link from "next/link";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { Responder, ResponseResource } from "@/types";

type CapacityRow = { label: string; search: string; total: number; available: number; assigned: number; unavailable: number; maintenance: number };

export function MunicipalResourceCapacityPanel({ responders, resources }: { responders: Responder[]; resources: ResponseResource[] }) {
  const municipalResources = resources.filter((item) => item.organizationType === "LT-MDRRMO");
  const municipalResponders = responders.filter((item) => item.organizationType === "LT-MDRRMO");
  const resourceRow = (label: string, search: string, matches: (resource: ResponseResource) => boolean): CapacityRow => {
    const matched = municipalResources.filter(matches);
    return { label, search, total: matched.length, available: matched.filter((item) => item.status === "Available").length, assigned: matched.filter((item) => item.status === "Dispatched").length, unavailable: matched.filter((item) => ["Unavailable", "Reserved"].includes(item.status)).length, maintenance: matched.filter((item) => item.status === "Under Maintenance").length };
  };
  const rows: CapacityRow[] = [
    resourceRow("Ambulances", "Ambulance", (item) => item.type === "Ambulance"),
    resourceRow("Rescue vehicles", "Rescue Vehicle", (item) => item.type === "Rescue Vehicle"),
    resourceRow("Fire trucks", "Fire Truck", (item) => item.type === "Fire Truck"),
    resourceRow("Service vehicles", "Patrol Vehicle", (item) => item.type === "Patrol Vehicle"),
    { label: "Response teams", search: "Response Team", total: municipalResponders.length, available: municipalResponders.filter((item) => item.availability === "Available").length, assigned: municipalResponders.filter((item) => ["Dispatched", "En Route", "Responding", "On Scene", "Busy"].includes(item.availability)).length, unavailable: municipalResponders.filter((item) => ["Unavailable", "Offline"].includes(item.availability)).length, maintenance: 0 },
    resourceRow("Medical equipment", "First Aid Kit", (item) => item.type === "First Aid Kit"),
    resourceRow("Rescue equipment", "Rescue Equipment", (item) => ["Rescue Equipment", "Water Rescue Equipment"].includes(item.type)),
  ];

  return (
    <TableContainer>
      <Table size="small" aria-label="Municipal resource capacity" sx={{ minWidth: 680 }}>
        <TableHead><TableRow><TableCell>Category</TableCell><TableCell align="center">Total</TableCell><TableCell align="center">Available</TableCell><TableCell align="center">Assigned</TableCell><TableCell align="center">Unavailable</TableCell><TableCell align="center">Maintenance</TableCell></TableRow></TableHead>
        <TableBody>{rows.map((row) => <TableRow key={row.label} hover><TableCell><Button component={Link} href={`/mdrrmo/responders-resources?search=${encodeURIComponent(row.search)}`} variant="text" size="small" sx={{ minHeight: 32, justifyContent: "flex-start", fontWeight: 800 }}>{row.label}</Button></TableCell>{[row.total, row.available, row.assigned, row.unavailable, row.maintenance].map((value, index) => <TableCell key={index} align="center" sx={{ fontWeight: index === 1 ? 800 : 600 }}>{value}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </TableContainer>
  );
}
