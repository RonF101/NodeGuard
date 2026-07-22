import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/mock_incidents.dart';
import '../data/mock_responder.dart';
import '../models/incident.dart';
import '../models/alert_level.dart';
import '../models/backup_request.dart';
import '../models/responder.dart';
import '../models/response_resource.dart';
import 'supabase_service.dart';

class NodeGuardDataException implements Exception {
  const NodeGuardDataException(this.message);

  final String message;

  @override
  String toString() => message;
}

enum IncidentStatusUpdateOutcome { saved, retryLater, rejected }

class IncidentStatusUpdateResult {
  const IncidentStatusUpdateResult._(this.outcome, this.message);

  const IncidentStatusUpdateResult.saved()
      : this._(IncidentStatusUpdateOutcome.saved, null);

  const IncidentStatusUpdateResult.retryLater(String message)
      : this._(IncidentStatusUpdateOutcome.retryLater, message);

  const IncidentStatusUpdateResult.rejected(String message)
      : this._(IncidentStatusUpdateOutcome.rejected, message);

  final IncidentStatusUpdateOutcome outcome;
  final String? message;

  bool get saved => outcome == IncidentStatusUpdateOutcome.saved;
  bool get shouldRetry => outcome == IncidentStatusUpdateOutcome.retryLater;
}

bool isCurrentResponderAssignment(
  Map<String, dynamic> row,
  String responderName,
) {
  if (row['assigned_responder_name'] == responderName) return true;
  if (const {
    'resolved',
    'closed',
    'false_alert',
    'unable_to_respond',
  }.contains(row['status'])) {
    return false;
  }

  final requests = row['backup_requests'];
  if (requests is! List) return false;
  for (final request in requests.whereType<Map>()) {
    final offers = request['backup_offers'];
    if (offers is! List) continue;
    for (final offer in offers.whereType<Map>()) {
      final responder = offer['responders'];
      if (offer['status'] == 'approved' &&
          responder is Map &&
          responder['name'] == responderName) {
        return true;
      }
    }
  }
  return false;
}

String normalizeCurrentAssignment(dynamic value) {
  final assignment = value?.toString().trim() ?? '';
  if (assignment.isEmpty ||
      assignment.toLowerCase() == 'none' ||
      assignment.toLowerCase() == 'no active assignment') {
    return 'No active assignment';
  }
  return assignment;
}

class NodeGuardRepository {
  const NodeGuardRepository();

  bool get isConfigured => SupabaseService.isConfigured;

  Future<List<Incident>> fetchIncidents({
    String? assignedResponderName,
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
      final incidents = await Future.wait(
        rows.map((row) => _incidentFromRow(row, client)),
      );
      return sortIncidentsByAlertLevel(incidents);
    } on PostgrestException catch (error) {
      throw NodeGuardDataException(
        'Unable to load live incidents: ${error.message}',
      );
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
    return client
        .from('incidents')
        .select(columns)
        .order('occurred_at', ascending: false)
        .then((rows) {
      final mapped = rows.map(Map<String, dynamic>.from).toList();
      if (assignedResponderName == null) return mapped;
      return mapped
          .where((row) => _isRowAssignedTo(row, assignedResponderName))
          .toList();
    });
  }

  bool _isRowAssignedTo(Map<String, dynamic> row, String responderName) {
    return isCurrentResponderAssignment(row, responderName);
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
      if (row == null) {
        throw const NodeGuardDataException(
          'This account is not linked to a NodeGuard responder profile.',
        );
      }
      return _responderFromRow(row);
    } on PostgrestException catch (error) {
      throw NodeGuardDataException(
        'Unable to load the responder profile: ${error.message}',
      );
    }
  }

  Future<IncidentStatusUpdateResult> submitIncidentStatusUpdate({
    required String publicId,
    required IncidentStatus status,
    required String remarks,
  }) async {
    final client = SupabaseService.client;
    if (client == null) return const IncidentStatusUpdateResult.saved();

    try {
      await client.rpc('update_nodeguard_incident_status', params: {
        'p_incident_public_id': publicId,
        'p_status': _statusToDb(status),
        'p_remarks': remarks.trim().isEmpty ? null : remarks.trim(),
      });
      return const IncidentStatusUpdateResult.saved();
    } on PostgrestException catch (error) {
      return IncidentStatusUpdateResult.rejected(error.message);
    } catch (_) {
      return const IncidentStatusUpdateResult.retryLater(
        'The update could not reach NodeGuard. It will retry when the connection is stable.',
      );
    }
  }

  Future<void> acknowledgeAssignment(String publicId) async {
    final client = SupabaseService.client;
    if (client == null) return;
    try {
      await client.rpc('acknowledge_nodeguard_assignment', params: {
        'p_incident_public_id': publicId,
      });
    } on PostgrestException catch (error) {
      throw NodeGuardDataException(error.message);
    }
  }

  Future<void> uploadFieldAttachment({
    required String publicId,
    required Uint8List bytes,
    required String fileName,
    required String contentType,
  }) async {
    final client = SupabaseService.client;
    if (client == null) return;
    if (bytes.isEmpty || bytes.length > 10 * 1024 * 1024) {
      throw const NodeGuardDataException(
        'Field attachments must be non-empty and no larger than 10 MB.',
      );
    }
    String? storagePath;
    try {
      final incident = await client
          .from('incidents')
          .select('id')
          .eq('public_id', publicId)
          .single();
      final safeName = fileName
          .replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '-')
          .replaceAll(RegExp(r'-+'), '-');
      storagePath = '$publicId/field/'
          '${DateTime.now().microsecondsSinceEpoch}-$safeName';
      await client.storage.from('incident-media').uploadBinary(
            storagePath,
            bytes,
            fileOptions: FileOptions(
              contentType: contentType,
              upsert: false,
            ),
          );
      await client.from('incident_attachments').insert({
        'incident_id': incident['id'],
        'storage_path': storagePath,
        'media_type': 'field_attachment',
        'uploaded_by': client.auth.currentUser?.id,
      });
    } on StorageException catch (error) {
      throw NodeGuardDataException(error.message);
    } on PostgrestException catch (error) {
      if (storagePath != null) {
        await client.storage.from('incident-media').remove([storagePath]);
      }
      throw NodeGuardDataException(error.message);
    }
  }

  Future<bool> updateAvailability(AvailabilityStatus availability) async {
    final client = SupabaseService.client;
    if (client == null) return true;

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
    if (client == null) return true;

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

  Future<void> updateAlertLevel({
    required String publicId,
    required IncidentAlertLevel alertLevel,
    String? reason,
  }) async {
    final client = SupabaseService.client;
    if (client == null) return;
    try {
      await client.rpc('update_nodeguard_alert_level', params: {
        'p_incident_public_id': publicId,
        'p_alert_level': alertLevel.databaseValue,
        'p_source': 'personnel_app',
        'p_reason': reason?.trim().isEmpty ?? true ? null : reason!.trim(),
      });
    } on PostgrestException catch (error) {
      throw NodeGuardDataException(error.message);
    }
  }

  Future<String> requestBackup({
    required String publicId,
    required List<BackupAssistanceType> assistanceTypes,
    required int respondersNeeded,
    required String reason,
    required IncidentAlertLevel urgency,
  }) async {
    final client = SupabaseService.client;
    if (client == null) {
      return 'mock-backup-${DateTime.now().millisecondsSinceEpoch}';
    }
    try {
      final result = await client.rpc('request_nodeguard_backup', params: {
        'p_incident_public_id': publicId,
        'p_assistance_types':
            assistanceTypes.map((type) => type.databaseValue).toList(),
        'p_responders_needed': respondersNeeded,
        'p_reason': reason.trim(),
        'p_urgency':
            urgency == IncidentAlertLevel.moderate ? 'moderate' : urgency.name,
        'p_source': 'personnel_app',
      });
      final data = result is Map ? Map<String, dynamic>.from(result) : null;
      return data?['id'] as String? ?? 'backup-request';
    } on PostgrestException catch (error) {
      throw NodeGuardDataException(error.message);
    }
  }

  Future<void> offerBackupAssistance(String requestId) async {
    final client = SupabaseService.client;
    if (client == null) return;
    try {
      await client.rpc('offer_nodeguard_backup', params: {
        'p_backup_request_id': requestId,
      });
    } on PostgrestException catch (error) {
      throw NodeGuardDataException(error.message);
    }
  }

  Future<void> cancelBackupRequest({
    required String requestId,
    required String reason,
  }) async {
    final client = SupabaseService.client;
    if (client == null) return;
    try {
      await client.rpc('cancel_nodeguard_backup_request', params: {
        'p_backup_request_id': requestId,
        'p_reason': reason.trim(),
      });
    } on PostgrestException catch (error) {
      throw NodeGuardDataException(error.message);
    }
  }

  Future<int> fetchUnreadBackupNotificationCount() async {
    final client = SupabaseService.client;
    if (client == null) return 0;
    try {
      final rows = await client
          .from('notifications')
          .select('id')
          .eq('is_read', false)
          .inFilter('type', const [
        'backup_requested',
        'backup_offer',
        'backup_confirmed',
        'backup_updated',
      ]);
      return rows.length;
    } on PostgrestException {
      return 0;
    }
  }

  Future<void> markBackupNotificationsRead() async {
    final client = SupabaseService.client;
    if (client == null) return;
    try {
      await client
          .from('notifications')
          .update({'is_read': true})
          .eq('is_read', false)
          .inFilter('type', const [
            'backup_requested',
            'backup_offer',
            'backup_confirmed',
            'backup_updated',
          ]);
    } on PostgrestException {
      return;
    }
  }

  Future<Incident> _incidentFromRow(
    Map<String, dynamic> row,
    SupabaseClient client,
  ) async {
    final status = _statusFromDb(row['status'] as String?);
    final notes = _notesFromRow(row);
    final device = _deviceLocationFromRow(row);
    final voice = _voiceContextFromRow(row);
    String? voiceUrl;
    String? cameraCaptureUrl;
    final storagePath = voice?['storage_path'];
    if (storagePath is String && storagePath.isNotEmpty) {
      try {
        voiceUrl = await client.storage
            .from('voice-contexts')
            .createSignedUrl(storagePath, 900);
      } on StorageException {
        voiceUrl = null;
      }
    }
    final cameraPath = row['camera_capture_path'];
    if (cameraPath is String && cameraPath.isNotEmpty) {
      try {
        cameraCaptureUrl = await client.storage
            .from('incident-media')
            .createSignedUrl(cameraPath, 900);
      } on StorageException {
        cameraCaptureUrl = null;
      }
    }
    final barangayValue = row['barangays'];
    final barangay = barangayValue is Map
        ? barangayValue
        : barangayValue is List && barangayValue.isNotEmpty
            ? barangayValue.first
            : null;
    return Incident(
      id: row['public_id'] as String? ?? 'NG-UNKNOWN',
      category: _categoryFromDb(row['category'] as String?),
      locationName: row['location_name'] as String? ?? 'Unknown location',
      approximateAddress:
          row['approximate_address'] as String? ?? 'Address unavailable',
      deviceId: row['device_id'] as String?,
      nodeLocation: row['node_location'] as String?,
      timestamp: DateTime.tryParse(row['reported_at'] as String? ?? '') ??
          DateTime.tryParse(row['occurred_at'] as String? ?? '') ??
          DateTime.now(),
      alertLevel: alertLevelFromDatabase(row['priority'] as String?),
      alertLevelUpdatedAt:
          DateTime.tryParse(row['priority_updated_at'] as String? ?? ''),
      alertLevelUpdatedBy: _latestPriorityActor(row),
      alertLevelUpdateSource: _alertLevelSourceLabel(
        row['priority_update_source'] as String?,
      ),
      alertLevelUpdateReason: row['priority_update_reason'] as String?,
      status: status,
      voiceContextAvailable:
          row['voice_context_available'] as bool? ?? voice != null,
      voiceDuration: row['voice_duration'] as String? ?? '00:00',
      assignedUnit: row['assigned_unit'] as String? ?? 'Unassigned unit',
      assignedResponder:
          row['assigned_responder_name'] as String? ?? 'Unassigned responder',
      assignedResponders: _assignedResponderNames(row),
      assignedResources: _assignedResourcesFromRow(row),
      description: row['incident_description'] as String? ??
          row['caller_context'] as String? ??
          'No field context available.',
      coordinates: row['coordinates'] as String? ?? 'Coordinates unavailable',
      notes: notes.isEmpty
          ? [
              'Loaded from shared NodeGuard backend. Current status: ${status.label}.'
            ]
          : notes,
      buzzerActive: device?['buzzer_active'] as bool? ?? false,
      buzzerUpdatedAt:
          DateTime.tryParse(device?['buzzer_updated_at'] as String? ?? ''),
      voiceUrl: voiceUrl,
      voiceTranscript: voice?['transcript'] as String?,
      activityHistory: [
        ..._priorityHistoryFromRow(row),
        ..._activityEventsFromRow(row),
      ],
      backupRequest: _backupRequestFromRow(row),
      barangayName: barangay is Map ? barangay['name'] as String? : null,
      assignmentSource: (row['assignment_source'] as String?)
                  ?.toLowerCase()
                  .contains('mdrrmo') ==
              true
          ? 'LT-MDRRMO'
          : row['assignment_source'] != null
              ? 'Barangay'
              : null,
      assignmentInstructions: row['assignment_instructions'] as String?,
      assignmentAcknowledgedAt: DateTime.tryParse(
        row['assignment_acknowledged_at'] as String? ?? '',
      ),
      cameraCaptureUrl: cameraCaptureUrl,
      sourceType: const {'iot_node', 'node_alert'}.contains(row['source_type'])
          ? 'IoT Node'
          : 'Manual Entry',
      reportingChannel:
          _reportingChannelLabel(row['reporting_channel'] as String?),
      reportingPersonOrSource: row['reporting_person_source'] as String?,
      reportingOffice: row['reporting_office'] as String?,
      incidentSubtype: row['incident_subtype'] as String?,
      landmark: row['nearby_landmark'] as String?,
      personsAffected: row['persons_affected'] as int?,
      affectedPersonsCondition: row['affected_persons_condition'] as String?,
    );
  }

  String _reportingChannelLabel(String? value) {
    const values = {
      'emergency_hotline': 'Emergency Hotline',
      'mobile_call': 'Mobile Call',
      'sms': 'SMS / Text Message',
      'social_media': 'Social Media Message',
      'email': 'Email',
      'walk_in': 'Walk-in Report',
      'radio': 'Radio',
      'barangay_personnel': 'Barangay Personnel',
      'mdrrmo_personnel': 'LT-MDRRMO Personnel',
      'field_responder': 'Field Responder',
      'partner_office': 'Partner Office / Organization',
      'iot_node': 'IoT Alert Node',
      'other': 'Other',
    };
    return values[value] ?? 'Not recorded';
  }

  Map<String, dynamic>? _voiceContextFromRow(Map<String, dynamic> row) {
    final voice = row['voice_contexts'];
    if (voice is Map<String, dynamic>) return voice;
    if (voice is List && voice.isNotEmpty && voice.first is Map) {
      return Map<String, dynamic>.from(voice.first as Map);
    }
    return null;
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
      currentAssignment: normalizeCurrentAssignment(row['current_assignment']),
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

  List<String> _assignedResponderNames(Map<String, dynamic> row) {
    final names = <String>{};
    final primary = row['assigned_responder_name'];
    if (primary is String && primary.isNotEmpty) names.add(primary);
    final assignments = row['incident_assignments'];
    if (assignments is List) {
      for (final assignment in assignments.whereType<Map>()) {
        final responders = assignment['responders'];
        if (responders is Map && responders['name'] is String) {
          names.add(responders['name'] as String);
        } else if (responders is List) {
          for (final responder in responders.whereType<Map>()) {
            if (responder['name'] is String) {
              names.add(responder['name'] as String);
            }
          }
        }
      }
    }
    return names.toList();
  }

  List<ResponseResource> _assignedResourcesFromRow(Map<String, dynamic> row) {
    final assignments = row['resource_assignments'];
    if (assignments is! List) return const [];

    final resources = <ResponseResource>[];
    for (final assignment in assignments.whereType<Map>()) {
      if (assignment['released_at'] != null) continue;
      final value = assignment['response_resources'];
      final resource = value is Map
          ? value
          : value is List && value.isNotEmpty && value.first is Map
              ? value.first as Map
              : null;
      if (resource == null) continue;
      resources.add(
        ResponseResource(
          id: resource['public_code'] as String? ?? 'RESOURCE',
          type: resource['resource_type'] as String? ?? 'Response resource',
          unitName: resource['unit_name'] as String? ?? 'Unnamed resource',
          agency: resource['agency'] as String? ?? 'Unknown agency',
          status: _resourceAvailabilityFromDb(resource['status'] as String?),
          baseLocation:
              resource['base_location'] as String? ?? 'Base not recorded',
          notes: resource['notes'] as String? ?? '',
          availabilityNote: resource['availability_note'] as String?,
        ),
      );
    }
    resources.sort((first, second) => first.id.compareTo(second.id));
    return resources;
  }

  ResourceAvailability _resourceAvailabilityFromDb(String? value) {
    switch (value) {
      case 'dispatched':
        return ResourceAvailability.dispatched;
      case 'under_maintenance':
        return ResourceAvailability.underMaintenance;
      case 'unavailable':
        return ResourceAvailability.unavailable;
      case 'reserved':
        return ResourceAvailability.reserved;
      default:
        return ResourceAvailability.available;
    }
  }

  String? _latestPriorityActor(Map<String, dynamic> row) {
    final updates = row['incident_priority_updates'];
    if (updates is! List || updates.isEmpty) return null;
    final sorted = updates.whereType<Map>().toList()
      ..sort((a, b) => (b['created_at'] as String? ?? '')
          .compareTo(a['created_at'] as String? ?? ''));
    return sorted.isEmpty ? null : sorted.first['actor_name'] as String?;
  }

  String? _alertLevelSourceLabel(String? value) {
    if (value == 'dashboard') return 'Dashboard';
    if (value == 'personnel_app') return 'Personnel Application';
    if (value == 'device') return 'Device';
    return null;
  }

  List<String> _priorityHistoryFromRow(Map<String, dynamic> row) {
    final updates = row['incident_priority_updates'];
    if (updates is! List) return const [];
    final sorted = updates.whereType<Map>().toList()
      ..sort((a, b) => (b['created_at'] as String? ?? '')
          .compareTo(a['created_at'] as String? ?? ''));
    return sorted.map((update) {
      final previous =
          alertLevelFromDatabase(update['previous_priority'] as String?).label;
      final next =
          alertLevelFromDatabase(update['new_priority'] as String?).label;
      final actor = update['actor_name'] as String? ?? 'NodeGuard user';
      final role = update['actor_role'] as String? ?? 'Authorized personnel';
      final source =
          _alertLevelSourceLabel(update['source'] as String?) ?? 'NodeGuard';
      final reason = update['reason'] as String?;
      return 'Alert level changed from $previous to $next by $actor, $role, at ${_formatTimestamp(update['created_at'] as String?)} via $source.${reason == null || reason.isEmpty ? '' : ' Reason: $reason'}';
    }).toList();
  }

  List<String> _activityEventsFromRow(Map<String, dynamic> row) {
    final events = row['incident_activity_events'];
    if (events is! List) return const [];
    final sorted = events.whereType<Map>().toList()
      ..sort((a, b) => (b['created_at'] as String? ?? '')
          .compareTo(a['created_at'] as String? ?? ''));
    return sorted.map((event) {
      final message =
          event['message'] as String? ?? 'Incident activity updated.';
      final actor = event['actor_name'] as String?;
      final source = _alertLevelSourceLabel(event['source'] as String?) ??
          (event['source'] == 'system' ? 'System' : 'NodeGuard');
      final reason = event['reason'] as String?;
      return '$message ${actor == null ? '' : 'By $actor. '}${_formatTimestamp(event['created_at'] as String?)} via $source.${reason == null || reason.isEmpty ? '' : ' Reason: $reason'}';
    }).toList();
  }

  BackupRequest? _backupRequestFromRow(Map<String, dynamic> row) {
    final requests = row['backup_requests'];
    if (requests is! List || requests.isEmpty) return null;
    final sorted = requests.whereType<Map>().toList()
      ..sort((a, b) => (b['requested_at'] as String? ?? '')
          .compareTo(a['requested_at'] as String? ?? ''));
    final active = sorted.where((request) => const {
          'requested',
          'assistance_offered',
          'partially_filled',
          'confirmed',
        }.contains(request['status']));
    final request = active.isNotEmpty ? active.first : sorted.first;
    final offers = request['backup_offers'] is List
        ? (request['backup_offers'] as List)
            .whereType<Map>()
            .map(_backupOfferFromRow)
            .toList()
        : <BackupOffer>[];
    return BackupRequest(
      id: request['id'] as String? ?? '',
      incidentId: row['public_id'] as String? ?? '',
      status: _backupRequestStatusFromDb(request['status'] as String?),
      requestedAt:
          DateTime.tryParse(request['requested_at'] as String? ?? '') ??
              DateTime.now(),
      requestedBy: request['requested_by'] as String? ?? '',
      requestingTeam: request['requesting_team'] as String? ?? 'Unknown team',
      assistanceTypes: (request['assistance_types'] as List? ?? const [])
          .whereType<String>()
          .map(_assistanceTypeFromDb)
          .toList(),
      respondersNeeded: request['responders_needed'] as int? ?? 1,
      reason: request['reason'] as String? ?? 'No reason provided.',
      urgency: alertLevelFromDatabase(request['urgency'] as String?),
      offers: offers,
      fulfilledAt: DateTime.tryParse(request['fulfilled_at'] as String? ?? ''),
      cancelledAt: DateTime.tryParse(request['cancelled_at'] as String? ?? ''),
      cancellationReason: request['cancellation_reason'] as String?,
    );
  }

  BackupOffer _backupOfferFromRow(Map<dynamic, dynamic> row) {
    final responderValue = row['responders'];
    final responder = responderValue is Map
        ? responderValue
        : responderValue is List &&
                responderValue.isNotEmpty &&
                responderValue.first is Map
            ? responderValue.first as Map
            : const <String, dynamic>{};
    return BackupOffer(
      id: row['id'] as String? ?? '',
      responderId: row['responder_id'] as String? ?? '',
      responderName: responder['name'] as String? ?? 'Unknown responder',
      responderAvailability: (responder['availability'] as String? ?? 'offline')
          .replaceAll('_', ' '),
      status: _backupOfferStatusFromDb(row['status'] as String?),
      offeredAt: DateTime.tryParse(row['offered_at'] as String? ?? '') ??
          DateTime.now(),
      decidedAt: DateTime.tryParse(row['decided_at'] as String? ?? ''),
      decisionNote: row['decision_note'] as String?,
    );
  }

  BackupRequestStatus _backupRequestStatusFromDb(String? value) {
    switch (value) {
      case 'assistance_offered':
        return BackupRequestStatus.assistanceOffered;
      case 'partially_filled':
        return BackupRequestStatus.partiallyFilled;
      case 'confirmed':
        return BackupRequestStatus.confirmed;
      case 'fulfilled':
        return BackupRequestStatus.fulfilled;
      case 'cancelled':
        return BackupRequestStatus.cancelled;
      case 'closed':
        return BackupRequestStatus.closed;
      default:
        return BackupRequestStatus.requested;
    }
  }

  BackupOfferStatus _backupOfferStatusFromDb(String? value) {
    switch (value) {
      case 'approved':
        return BackupOfferStatus.approved;
      case 'declined':
        return BackupOfferStatus.declined;
      case 'withdrawn':
        return BackupOfferStatus.withdrawn;
      default:
        return BackupOfferStatus.offered;
    }
  }

  BackupAssistanceType _assistanceTypeFromDb(String value) {
    switch (value) {
      case 'medical':
        return BackupAssistanceType.medical;
      case 'fire':
        return BackupAssistanceType.fire;
      case 'police_public_safety':
        return BackupAssistanceType.policePublicSafety;
      case 'rescue':
        return BackupAssistanceType.rescue;
      case 'barangay':
        return BackupAssistanceType.barangay;
      case 'equipment_vehicle':
        return BackupAssistanceType.equipmentVehicle;
      default:
        return BackupAssistanceType.general;
    }
  }

  IncidentStatus _statusFromDb(String? value) {
    switch (value) {
      case 'new_alert':
        return IncidentStatus.newAlert;
      case 'assigned':
      case 'validated':
      case 'dispatched':
      case 'escalated':
        return IncidentStatus.assigned;
      case 'coordinated_by_mdrrmo':
        return IncidentStatus.enRoute;
      case 'unable_to_respond':
        return IncidentStatus.unableToRespond;
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
      case IncidentStatus.unableToRespond:
        return 'unable_to_respond';
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
source_type,
reporting_channel,
reporting_person_source,
reporting_office,
incident_subtype,
nearby_landmark,
persons_affected,
affected_persons_condition,
barangay_id,
barangays(name),
category,
location_name,
approximate_address,
device_id,
node_location,
occurred_at,
reported_at,
priority,
priority_updated_at,
priority_updated_by,
priority_update_source,
priority_update_reason,
status,
voice_context_available,
voice_duration,
assigned_unit,
assigned_responder_name,
assignment_source,
assignment_instructions,
assignment_acknowledged_at,
incident_description,
camera_capture_path,
caller_context,
coordinates,
incident_status_updates(remarks, status, created_at),
incident_priority_updates(id, previous_priority, new_priority, actor_name, actor_role, source, reason, created_at),
incident_activity_events(id, event_type, message, actor_name, actor_role, source, reason, created_at),
incident_assignments(responder_id, responders(name, profile_id)),
resource_assignments(id, assigned_at, released_at, response_resources(public_code, resource_type, unit_name, agency, status, base_location, notes, availability_note)),
backup_requests(id, status, requested_at, requested_by, requesting_team, assistance_types, responders_needed, reason, urgency, fulfilled_at, cancelled_at, cancellation_reason, backup_offers(id, responder_id, status, offered_at, decided_at, decision_note, responders(name, availability))),
device_locations(buzzer_active, buzzer_updated_at),
voice_contexts(storage_path, transcript, duration_seconds)
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
