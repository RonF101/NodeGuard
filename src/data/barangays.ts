import type { Barangay } from "@/types";

export const barangays: Barangay[] = [
  { id: "brgy-pico", code: "PICO", name: "Pico", isParticipating: true, emergencyContact: "Barangay Pico Emergency Desk" },
  { id: "brgy-betag", code: "BETAG", name: "Betag", isParticipating: true, emergencyContact: "Barangay Betag Emergency Desk" },
  { id: "brgy-balili", code: "BALILI", name: "Balili", isParticipating: true, emergencyContact: "Barangay Balili Emergency Desk" },
  { id: "brgy-puguis", code: "PUGUIS", name: "Puguis", isParticipating: true, emergencyContact: "Barangay Puguis Emergency Desk" },
];

export const demoBarangay = barangays[0];
