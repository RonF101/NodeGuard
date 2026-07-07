import '../models/device_location.dart';

const mockLocations = <DeviceLocation>[
  DeviceLocation(
    name: 'Pico',
    deviceId: 'LT-NODE-005',
    approximateAddress: 'Barangay Pico, La Trinidad, Benguet',
    coordinates: '16.4558, 120.5892',
    zone: 'North corridor',
  ),
  DeviceLocation(
    name: 'Km. 4',
    deviceId: 'LT-NODE-003',
    approximateAddress: 'Km. 4 commercial strip, La Trinidad',
    coordinates: '16.4526, 120.5877',
    zone: 'Central corridor',
  ),
  DeviceLocation(
    name: 'Km. 5',
    deviceId: 'LT-NODE-001',
    approximateAddress: 'Km. 5 municipal approach, La Trinidad',
    coordinates: '16.4591, 120.5894',
    zone: 'Municipal center',
  ),
  DeviceLocation(
    name: 'Public Market',
    deviceId: 'LT-NODE-002',
    approximateAddress: 'La Trinidad Public Market',
    coordinates: '16.4612, 120.5899',
    zone: 'Market area',
  ),
  DeviceLocation(
    name: 'Transport Terminal',
    deviceId: 'LT-NODE-006',
    approximateAddress: 'Municipal transport terminal',
    coordinates: '16.4597, 120.5908',
    zone: 'Transport area',
  ),
  DeviceLocation(
    name: 'School Area',
    deviceId: 'LT-NODE-004',
    approximateAddress: 'School zone, Barangay Betag',
    coordinates: '16.4504, 120.5864',
    zone: 'Institutional area',
  ),
];
