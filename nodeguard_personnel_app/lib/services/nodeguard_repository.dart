import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/mock_incidents.dart';
import '../data/mock_responder.dart';
import '../models/incident.dart';
import '../models/responder.dart';
import 'supabase_service.dart';

class NodeGuardRepository {
  const NodeGuardRepository();

  bool get isConfigured => SupabaseService.isConfigured;

  Future<List<Incident>> fetchIncidents({
    String? assignedResponderName,
    bool fallbackWhenAssignedEmpty = true,
  }) async {
    final client = SupabaseService.client;
    if (client == null) {
      return _mockIncidentsFor(assignedResponderName);
    }

    try {
      final rows = await _fetchIncidentRows(
        client: client,
        assignedResponderName: assignedResponderName,
      );
      if (rows.isEmpty &&
          assignedResponderName != null &&
          fallbackWhenAssignedEmpty) {
        final fallbackRows = await _fetchIncidentRows(client: client);
        return fallbackRows.map(_incidentFromRow).toList();
      }
      return rows.map(_incidentFromRow).toList();
    } on PostgrestException {
      return _mockIncidentsFor(assignedResponderName);
    }
  }

  List<Incident> _mockIncidentsFor(String? assignedResponderName) {
    if (assignedResponderName == null) return List.of(mockIncidents);
    return mockIncidents
        .where(
            (incident) => incident.assignedResponder == assignedResponderName)
        .toList();
  }

  Future<List<Map<String, dynamic>>> _fetchIncidentRows({
    required SupabaseClient client,
    String? assignedResponderName,
  }) async {
    try {
      return await _fetchIncidentRowsWithColumns(
        client: client,
        columns: _incidentSelectColumns,
        assignedResponderName: assignedResponderName,
      );
    } on PostgrestException {
      return _fetchIncidentRowsWithColumns(
        client: client,
        columns: _incidentSelectColumnsWithoutBuzzer,
        assignedResponderName: assignedResponderName,
      );
    }
  }

  Future<List<Map<String, dynamic>>> _fetchIncidentRowsWithColumns({
    required SupabaseClient client,
    required String columns,
    String? assignedResponderName,
  }) {
    var query = client.from('incidents').select(columns);
    if (assignedResponderName != null) {
      query = query.eq('assigned_responder_name', assignedResponderName);
    }
    return query.order('occurred_at', ascending: false).then(
          (rows) => rows.map(Map<String, dynamic>.from).toList(),
        );
  }

  Future<Responder> fetchResponder() async {
    final client = SupabaseService.client;
    if (client == null) return mockResponder;

    try {
      final row = await client
          .from('responders')
          .select()
          .eq('profile_id', client.auth.currentUser?.id ?? '')
          .maybeSingle();
      if (row == null) return mockResponder;
      return _responderFromRow(row);
    } on PostgrestException {
      return mockResponder;
    }
  }

  Future<bool> submitIncidentStatusUpdate({
    required String publicId,
    required IncidentStatus status,
    required String remarks,
  }) async {
    final client = SupabaseService.client;
    if (client == null) return false;

    try {
      final incident = await client
          .from('incidents')
          .select('id')
          .eq('public_id', publicId)
          .maybeSingle();
      if (incident == null) return false;

      await client.from('incident_status_updates').insert({
        'incident_id': incident['id'],
        'status': _statusToDb(status),
        'remarks': remarks.isEmpty ? null : remarks,
        'created_by': client.auth.currentUser?.id,
      });
      return true;
    } on PostgrestException {
      return false;
    }
  }

  Future<bool> updateAvailability(AvailabilityStatus availability) async {
    final client = SupabaseService.client;
    if (client == null) return false;

    try {
      final userId = client.auth.currentUser?.id;
      if (userId == null) return false;

      final rows = await client
          .from('responders')
          .update({
            'availability': _availabilityToDb(availability),
            'last_status_update': DateTime.now().toIso8601String(),
          })
          .eq('profile_id', userId)
          .select('id');
      return rows.isNotEmpty;
    } on PostgrestException {
      return false;
    }
  }

  Future<bool> setDeviceBuzzer({
    required String deviceId,
    required bool active,
  }) async {
    final client = SupabaseService.client;
    if (client == null) return false;

    try {
      await client.rpc('set_device_buzzer', params: {
        'p_device_id': deviceId,
        'p_active': active,
        'p_source': 'personnel_app',
      });
      return true;
    } on PostgrestException {
      return false;
    }
  }

  Incident _incidentFromRow(Map<String, dynamic> row) {
    final status = _statusFromDb(row['status'] as String?);
    final notes = _notesFromRow(row);
    final device = _deviceLocationFromRow(row);
    return Incident(
      id: row['public_id'] as String? ?? 'NG-UNKNOWN',
      category: _categoryFromDb(row['category'] as String?),
      locationName: row['location_name'] as String? ?? 'Unknown location',
      approximateAddress:
          row['approximate_address'] as String? ?? 'Address unavailable',
      deviceId: row['device_id'] as String? ?? 'UNKNOWN-NODE',
      nodeLocation:
          row['node_location'] as String? ?? 'Node location unavailable',
      timestamp: DateTime.tryParse(row['occurred_at'] as String? ?? '') ??
          DateTime.now(),
      priority: _priorityFromDb(row['priority'] as String?),
      status: status,
      voiceContextAvailable: row['voice_context_available'] as bool? ?? false,
      voiceDuration: row['voice_duration'] as String? ?? '00:00',
      assignedUnit: row['assigned_unit'] as String? ?? 'Unassigned unit',
      assignedResponder:
          row['assigned_responder_name'] as String? ?? 'Unassigned responder',
      description:
          row['caller_context'] as String? ?? 'No field context available.',
      coordinates: row['coordinates'] as String? ?? 'Coordinates unavailable',
      notes: notes.isEmpty
          ? [
              'Loaded from shared NodeGuard backend. Current status: ${status.label}.'
            ]
          : notes,
      buzzerActive: device?['buzzer_active'] as bool? ?? false,
      buzzerUpdatedAt:
          DateTime.tryParse(device?['buzzer_updated_at'] as String? ?? ''),
    );
  }

  Map<String, dynamic>? _deviceLocationFromRow(Map<String, dynamic> row) {
    final device = row['device_locations'];
    if (device is Map<String, dynamic>) return device;
    if (device is List && device.isNotEmpty && device.first is Map) {
      return Map<String, dynamic>.from(device.first as Map);
    }
    return null;
  }

  List<String> _notesFromRow(Map<String, dynamic> row) {
    final updates = row['incident_status_updates'];
    if (updates is! List) return const [];

    final notes = updates.whereType<Map<String, dynamic>>().where((update) {
      final remarks = update['remarks'];
      return remarks is String && remarks.trim().isNotEmpty;
    }).toList()
      ..sort((a, b) => (b['created_at'] as String? ?? '')
          .compareTo(a['created_at'] as String? ?? ''));

    return notes.map((update) {
      final status = _statusFromDb(update['status'] as String?);
      final timestamp = _formatTimestamp(update['created_at'] as String?);
      return '${status.label} - $timestamp\n${(update['remarks'] as String).trim()}';
    }).toList();
  }

  Responder _responderFromRow(Map<String, dynamic> row) {
    return Responder(
      name: row['name'] as String? ?? mockResponder.name,
      role: row['role'] as String? ?? mockResponder.role,
      agencyUnit: row['agency_unit'] as String? ?? mockResponder.agencyUnit,
      contactNumber:
          row['contact_number'] as String? ?? mockResponder.contactNumber,
      availability: _availabilityFromDb(row['availability'] as String?),
      currentAssignment:
          row['current_assignment'] as String? ?? 'No active assignment',
    );
  }

  IncidentCategory _categoryFromDb(String? value) {
    switch (value) {
      case 'medical':
        return IncidentCategory.medical;
      case 'security_public_safety':
        return IncidentCategory.security;
      case 'fire_disaster':
        return IncidentCategory.fireDisaster;
      default:
        return IncidentCategory.medical;
    }
  }

  IncidentPriority _priorityFromDb(String? value) {
    switch (value) {
      case 'critical':
        return IncidentPriority.critical;
      case 'high':
        return IncidentPriority.high;
      case 'medium':
        return IncidentPriority.medium;
      case 'low':
        return IncidentPriority.low;
      default:
        return IncidentPriority.medium;
    }
  }

  IncidentStatus _statusFromDb(String? value) {
    switch (value) {
      case 'new_alert':
        return IncidentStatus.newAlert;
      case 'assigned':
        return IncidentStatus.assigned;
      case 'en_route':
        return IncidentStatus.enRoute;
      case 'on_scene':
        return IncidentStatus.onScene;
      case 'responding':
        return IncidentStatus.responding;
      case 'resolved':
        return IncidentStatus.resolved;
      case 'closed':
        return IncidentStatus.closed;
      case 'need_backup':
        return IncidentStatus.needBackup;
      case 'false_alert':
        return IncidentStatus.falseAlert;
      default:
        return IncidentStatus.assigned;
    }
  }

  String _statusToDb(IncidentStatus status) {
    switch (status) {
      case IncidentStatus.newAlert:
        return 'new_alert';
      case IncidentStatus.assigned:
        return 'assigned';
      case IncidentStatus.enRoute:
        return 'en_route';
      case IncidentStatus.onScene:
        return 'on_scene';
      case IncidentStatus.responding:
        return 'responding';
      case IncidentStatus.resolved:
        return 'resolved';
      case IncidentStatus.closed:
        return 'closed';
      case IncidentStatus.needBackup:
        return 'need_backup';
      case IncidentStatus.falseAlert:
        return 'false_alert';
    }
  }

  AvailabilityStatus _availabilityFromDb(String? value) {
    switch (value) {
      case 'available':
        return AvailabilityStatus.available;
      case 'dispatched':
        return AvailabilityStatus.dispatched;
      case 'busy':
        return AvailabilityStatus.busy;
      case 'offline':
        return AvailabilityStatus.offline;
      default:
        return AvailabilityStatus.available;
    }
  }

  String _availabilityToDb(AvailabilityStatus availability) {
    switch (availability) {
      case AvailabilityStatus.available:
        return 'available';
      case AvailabilityStatus.dispatched:
        return 'dispatched';
      case AvailabilityStatus.busy:
        return 'busy';
      case AvailabilityStatus.offline:
        return 'offline';
    }
  }

  String _formatTimestamp(String? value) {
    final parsed = DateTime.tryParse(value ?? '');
    if (parsed == null) return 'Time unavailable';
    final local = parsed.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    final hour = local.hour.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    return '${local.year}-$month-$day $hour:$minute';
  }
}

const _incidentSelectColumns = '''
public_id,
category,
location_name,
approximate_address,
device_id,
node_location,
occurred_at,
priority,
status,
voice_context_available,
voice_duration,
assigned_unit,
assigned_responder_name,
caller_context,
coordinates,
incident_status_updates(remarks, status, created_at),
device_locations(buzzer_active, buzzer_updated_at)
''';

const _incidentSelectColumnsWithoutBuzzer = '''
public_id,
category,
location_name,
approximate_address,
device_id,
node_location,
occurred_at,
priority,
status,
voice_context_available,
voice_duration,
assigned_unit,
assigned_responder_name,
caller_context,
coordinates,
incident_status_updates(remarks, status, created_at)
''';
