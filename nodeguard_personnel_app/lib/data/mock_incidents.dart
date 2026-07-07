import '../models/incident.dart';

final mockIncidents = _buildMockIncidents();

const _demoCaseIds = <int>[101, 111, 121, 131, 141, 151, 161, 171, 181];
const _demoStatuses = <IncidentStatus>[
  IncidentStatus.newAlert,
  IncidentStatus.assigned,
  IncidentStatus.enRoute,
  IncidentStatus.onScene,
  IncidentStatus.responding,
  IncidentStatus.resolved,
  IncidentStatus.closed,
  IncidentStatus.needBackup,
  IncidentStatus.falseAlert,
];

const _locations = <_IncidentLocation>[
  _IncidentLocation(
    IncidentCategory.medical,
    'LT-NODE-005',
    'Km. 5 Pico',
    'Km. 5, Barangay Pico, La Trinidad, Benguet',
    'Pico roadside node',
    '16.4558, 120.5892',
    'Resident reports a person needing urgent medical assistance near the roadside.',
    IncidentPriority.critical,
  ),
  _IncidentLocation(
    IncidentCategory.security,
    'LT-NODE-002',
    'Public Market',
    'La Trinidad Public Market, Km. 5, La Trinidad',
    'Market entrance node',
    '16.4612, 120.5899',
    'Public safety concern reported near the produce loading area.',
    IncidentPriority.high,
  ),
  _IncidentLocation(
    IncidentCategory.fireDisaster,
    'LT-NODE-006',
    'Transport Terminal',
    'Municipal transport terminal, La Trinidad',
    'Terminal bay node',
    '16.4597, 120.5908',
    'Possible fire or disaster-related report near the terminal bay.',
    IncidentPriority.high,
  ),
];

List<Incident> _buildMockIncidents() {
  final incidents = <Incident>[];
  for (var groupIndex = 0; groupIndex < _demoCaseIds.length; groupIndex++) {
    final baseId = _demoCaseIds[groupIndex];
    for (var locationIndex = 0;
        locationIndex < _locations.length;
        locationIndex++) {
      final location = _locations[locationIndex];
      final status = _demoStatuses[groupIndex];
      final isAssignedToCurrentResponder = status != IncidentStatus.newAlert &&
          status != IncidentStatus.closed &&
          status != IncidentStatus.falseAlert;
      incidents.add(
        Incident(
          id: 'NG-2026-${baseId + locationIndex}',
          category: location.category,
          locationName: location.name,
          approximateAddress: location.address,
          deviceId: location.deviceId,
          nodeLocation: location.nodeLocation,
          timestamp: DateTime(
              2026, 7, 6, 8 - (groupIndex ~/ 3), 42 - locationIndex * 9),
          priority:
              groupIndex < 2 ? IncidentPriority.critical : location.priority,
          voiceContextAvailable: locationIndex != 2,
          voiceDuration: locationIndex == 0
              ? '00:12'
              : locationIndex == 1
                  ? '00:09'
                  : '00:15',
          assignedUnit: isAssignedToCurrentResponder
              ? 'MDRRMO Rescue Unit'
              : 'Unassigned',
          assignedResponder: isAssignedToCurrentResponder
              ? 'Ronie Delos Santos'
              : 'Unassigned',
          description:
              '${location.context} Demo ${status.label.toLowerCase()} case ${groupIndex + 1}.',
          coordinates: location.coordinates,
          notes: ['Mock ${status.label} incident for demonstration.'],
          buzzerActive: false,
          buzzerUpdatedAt: null,
          status: status,
        ),
      );
    }
  }
  return incidents;
}

class _IncidentLocation {
  const _IncidentLocation(
    this.category,
    this.deviceId,
    this.name,
    this.address,
    this.nodeLocation,
    this.coordinates,
    this.context,
    this.priority,
  );

  final IncidentCategory category;
  final String deviceId;
  final String name;
  final String address;
  final String nodeLocation;
  final String coordinates;
  final String context;
  final IncidentPriority priority;
}
