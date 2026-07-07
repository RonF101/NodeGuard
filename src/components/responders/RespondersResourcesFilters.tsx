import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { ResourceStatus, ResourceType, ResponderStatus } from "@/types";

export type ResponderFilters = {
  agency: string;
  responderStatus: ResponderStatus | "All";
  resourceType: ResourceType | "All";
  resourceStatus: ResourceStatus | "All";
};

type RespondersResourcesFiltersProps = {
  filters: ResponderFilters;
  agencies: string[];
  onChange: (filters: ResponderFilters) => void;
};

const responderStatuses: Array<ResponderStatus | "All"> = [
  "All",
  "Available",
  "En Route",
  "On Scene",
  "Responding",
  "Busy",
  "Offline"
];
const resourceStatuses: Array<ResourceStatus | "All"> = [
  "All",
  "Available",
  "Dispatched",
  "Under Maintenance",
  "Unavailable",
  "Reserved"
];
const resourceTypes: Array<ResourceType | "All"> = [
  "All",
  "Ambulance",
  "Fire Truck",
  "Rescue Vehicle",
  "Patrol Vehicle",
  "Communication Radio",
  "First Aid Kit",
  "Rescue Equipment",
  "Water Rescue Equipment"
];

export function RespondersResourcesFilters({ filters, agencies, onChange }: RespondersResourcesFiltersProps) {
  return (
    <Card>
      <CardContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Agency / Unit
            </Typography>
            <Select
              fullWidth
              value={filters.agency}
              onChange={(event) => onChange({ ...filters, agency: event.target.value })}
            >
              <MenuItem value="All">All Agencies</MenuItem>
              {agencies.map((agency) => (
                <MenuItem key={agency} value={agency}>
                  {agency}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Personnel Availability
            </Typography>
            <Select
              fullWidth
              value={filters.responderStatus}
              onChange={(event) =>
                onChange({ ...filters, responderStatus: event.target.value as ResponderStatus | "All" })
              }
            >
              {responderStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Resource Type
            </Typography>
            <Select
              fullWidth
              value={filters.resourceType}
              onChange={(event) => onChange({ ...filters, resourceType: event.target.value as ResourceType | "All" })}
            >
              {resourceTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
              Resource Availability
            </Typography>
            <Select
              fullWidth
              value={filters.resourceStatus}
              onChange={(event) => onChange({ ...filters, resourceStatus: event.target.value as ResourceStatus | "All" })}
            >
              {resourceStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
