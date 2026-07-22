import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/backup_request.dart';
import '../models/alert_level.dart';
import '../models/incident.dart';
import '../models/response_resource.dart';
import '../services/nodeguard_repository.dart';
import '../services/operational_mode_service.dart';
import '../services/supabase_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_layout.dart';
import '../widgets/incident_card.dart';
import '../widgets/alert_level_chip.dart';
import '../widgets/status_chip.dart';
import '../widgets/status_update_sheet.dart';
import '../widgets/voice_context_card.dart';
import '../widgets/alert_level_update_sheet.dart';
import '../widgets/request_backup_sheet.dart';
import 'map_screen.dart';

class IncidentDetailsScreen extends StatefulWidget {
  const IncidentDetailsScreen({
    super.key,
    required this.incidentId,
    required this.incidents,
    required this.onIncidentStatusChanged,
    this.onIncidentResolved,
  });

  final String incidentId;
  final List<Incident> incidents;
  final IncidentStatusUpdateCallback onIncidentStatusChanged;
  final VoidCallback? onIncidentResolved;

  @override
  State<IncidentDetailsScreen> createState() => _IncidentDetailsScreenState();
}

class _IncidentDetailsScreenState extends State<IncidentDetailsScreen> {
  final _repository = const NodeGuardRepository();
  bool _isTogglingBuzzer = false;
  bool _isCancellingBackup = false;
  bool _isAcknowledgingAssignment = false;
  bool _isUploadingAttachment = false;
  final _imagePicker = ImagePicker();
  RealtimeChannel? _realtimeChannel;
  late Incident _incident =
      widget.incidents.firstWhere((item) => item.id == widget.incidentId);

  @override
  void initState() {
    super.initState();
    _subscribeToIncident();
  }

  @override
  void didUpdateWidget(covariant IncidentDetailsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final matches =
        widget.incidents.where((item) => item.id == widget.incidentId);
    if (matches.isNotEmpty && matches.first != _incident) {
      _incident = matches.first;
    }
  }

  void _subscribeToIncident() {
    final client = SupabaseService.client;
    if (client == null) return;
    _realtimeChannel = client
        .channel('nodeguard-incident-details-${widget.incidentId}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'incidents',
          callback: (_) => _refreshIncident(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'incident_priority_updates',
          callback: (_) => _refreshIncident(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'backup_requests',
          callback: (_) => _refreshIncident(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'backup_offers',
          callback: (_) => _refreshIncident(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'resource_assignments',
          callback: (_) => _refreshIncident(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'response_resources',
          callback: (_) => _refreshIncident(),
        )
        .subscribe();
  }

  Future<void> _refreshIncident() async {
    try {
      final incidents = await _repository.fetchIncidents();
      final matches = incidents.where((item) => item.id == widget.incidentId);
      if (!mounted || matches.isEmpty) return;
      final next = matches.first;
      final alertLevelChanged = next.alertLevel != _incident.alertLevel;
      final previous = _incident.alertLevel;
      setState(() => _incident = next);
      if (alertLevelChanged) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Alert level changed from ${previous.label} to ${next.alertLevel.label} by another connected user.',
            ),
          ),
        );
      }
    } on NodeGuardDataException {
      return;
    }
  }

  void _showAlertLevelSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => AlertLevelUpdateSheet(
        incident: _incident,
        onUpdated: (incident) {
          setState(() => _incident = incident);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text(
                    'Alert level confirmed as ${incident.alertLevel.label}.')),
          );
        },
      ),
    );
  }

  void _showBackupSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => RequestBackupSheet(
        incident: _incident,
        onRequested: (incident) {
          setState(() => _incident = incident);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Backup request sent to eligible available responders and the incident coordination desk.',
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _cancelBackup() async {
    final request = _incident.backupRequest;
    if (request == null) return;
    final controller = TextEditingController();
    final reason = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Cancel backup request'),
        content: TextField(
          controller: controller,
          maxLength: 500,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Cancellation reason',
            hintText: 'Explain why additional assistance is no longer needed',
          ),
        ),
        actions: [
          OutlinedButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Keep Request'),
          ),
          FilledButton(
            onPressed: () {
              final value = controller.text.trim();
              if (value.isNotEmpty) Navigator.pop(dialogContext, value);
            },
            child: const Text('Cancel Request'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (reason == null || !mounted) return;
    setState(() => _isCancellingBackup = true);
    try {
      await _repository.cancelBackupRequest(
          requestId: request.id, reason: reason);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Backup request cancelled.')),
      );
      await _refreshIncident();
    } on NodeGuardDataException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.message)),
      );
    } finally {
      if (mounted) setState(() => _isCancellingBackup = false);
    }
  }

  Future<void> _acknowledgeAssignment() async {
    setState(() => _isAcknowledgingAssignment = true);
    try {
      await _repository.acknowledgeAssignment(_incident.id);
      if (!mounted) return;
      setState(() => _incident = _incident.copyWith(
            assignmentAcknowledgedAt: DateTime.now(),
          ));
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Assignment acknowledged.')),
      );
    } on NodeGuardDataException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _isAcknowledgingAssignment = false);
    }
  }

  Future<void> _pickAndUploadAttachment(ImageSource source) async {
    if (!OperationalModeService.instance.online) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'A live connection is required to upload private incident evidence.'),
        ),
      );
      return;
    }
    final selected = await _imagePicker.pickImage(
      source: source,
      imageQuality: 82,
      maxWidth: 1800,
    );
    if (selected == null || !mounted) return;
    setState(() => _isUploadingAttachment = true);
    try {
      await _repository.uploadFieldAttachment(
        publicId: _incident.id,
        bytes: await selected.readAsBytes(),
        fileName: selected.name,
        contentType: selected.mimeType ?? 'image/jpeg',
      );
      if (!mounted) return;
      setState(() {
        final history = List<String>.of(_incident.activityHistory)
          ..insert(0, 'Field attachment uploaded by the assigned responder.');
        _incident = _incident.copyWith(activityHistory: history);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Private field attachment uploaded.')),
      );
    } on NodeGuardDataException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) setState(() => _isUploadingAttachment = false);
    }
  }

  void _showAttachmentSource() {
    showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Add Field Attachment',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w900,
                      )),
              const SizedBox(height: 6),
              const Text(
                'Photos remain private and are available only to personnel authorized for this incident.',
                style: TextStyle(color: AppColors.mutedText),
              ),
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: () {
                  Navigator.pop(sheetContext);
                  _pickAndUploadAttachment(ImageSource.camera);
                },
                icon: const Icon(Icons.photo_camera_outlined),
                label: const Text('Take Photo'),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(sheetContext);
                  _pickAndUploadAttachment(ImageSource.gallery);
                },
                icon: const Icon(Icons.photo_library_outlined),
                label: const Text('Choose Existing Photo'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    final client = SupabaseService.client;
    if (client != null && _realtimeChannel != null) {
      client.removeChannel(_realtimeChannel!);
    }
    super.dispose();
  }

  Future<void> _showStatusSheet() async {
    final wasTerminal = _incident.isResponderTerminal;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => StatusUpdateSheet(
        incident: _incident,
        onSubmit: (status, remarks) async {
          final saved = await widget.onIncidentStatusChanged(
            _incident.id,
            status,
            remarks,
          );
          if (!saved || !mounted) return false;
          setState(() {
            final updatedNotes = List<String>.of(_incident.notes)
              ..insert(
                  0,
                  remarks.isEmpty
                      ? 'Status updated to ${status.label}.'
                      : '${status.label}: $remarks');
            _incident = _incident.copyWith(status: status, notes: updatedNotes);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text('${_incident.id} updated to ${status.label}')),
          );
          return true;
        },
      ),
    );
    if (!mounted || wasTerminal || !_incident.isResponderTerminal) return;
    widget.onIncidentResolved?.call();
    Navigator.of(context).pop();
  }

  Future<void> _toggleBuzzer() async {
    final deviceId = _incident.deviceId;
    if (deviceId == null) return;
    final nextActive = !_incident.buzzerActive;
    if (!OperationalModeService.instance.online) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Offline · Local Sync. Buzzer commands require a live connection and are never queued.'),
        ),
      );
      return;
    }
    if (!await _confirmBuzzerCommand(nextActive)) return;
    setState(() => _isTogglingBuzzer = true);

    final updated = await _repository.setDeviceBuzzer(
      deviceId: deviceId,
      active: nextActive,
    );

    if (!mounted) return;
    setState(() {
      _isTogglingBuzzer = false;
      if (updated) {
        _incident = _incident.copyWith(
          buzzerActive: nextActive,
          buzzerUpdatedAt: DateTime.now(),
        );
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          updated
              ? 'Node buzzer ${nextActive ? 'activated' : 'deactivated'}.'
              : 'Buzzer command failed. Check your assignment and connection.',
        ),
      ),
    );
  }

  Future<bool> _confirmBuzzerCommand(bool activate) async {
    var reviewed = false;
    return await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (dialogContext) => StatefulBuilder(
            builder: (context, setDialogState) => AlertDialog(
              title: Text(activate
                  ? 'Activate urgent node buzzer'
                  : 'Deactivate node buzzer'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    activate
                        ? 'This sends an urgent audible command to ${_incident.deviceId}. Confirm the device and field impact.'
                        : 'This stops the active audible command on ${_incident.deviceId}.',
                  ),
                  const SizedBox(height: 12),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: reviewed,
                    onChanged: (value) =>
                        setDialogState(() => reviewed = value ?? false),
                    title: const Text(
                        'I reviewed the device, incident, and operational impact.'),
                    controlAffinity: ListTileControlAffinity.leading,
                  ),
                ],
              ),
              actions: [
                OutlinedButton(
                  onPressed: () => Navigator.pop(dialogContext, false),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  style: activate
                      ? FilledButton.styleFrom(backgroundColor: AppColors.goRed)
                      : null,
                  onPressed: reviewed
                      ? () => Navigator.pop(dialogContext, true)
                      : null,
                  child: Text(
                      activate ? 'Activate Buzzer' : 'Confirm Deactivation'),
                ),
              ],
            ),
          ),
        ) ??
        false;
  }

  void _openMap() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MapScreen(
          incidents: widget.incidents,
          selectedIncident: _incident,
          onIncidentStatusChanged: widget.onIncidentStatusChanged,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_incident.id)),
      bottomNavigationBar: _incident.isResponderTerminal
          ? null
          : SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                child: Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _openMap,
                        icon: const Icon(Icons.map_outlined),
                        label: const Text('View Map'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: FilledButton.icon(
                        onPressed: _showStatusSheet,
                        icon: const Icon(Icons.update_outlined),
                        label: const Text('Next Response Step'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
      body: ListView(
        padding: AppLayout.pagePadding(context),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _incident.category.label,
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w900),
                ),
              ),
              Icon(_incident.category.icon, color: AppColors.setBlue, size: 30),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 6, children: [
            AlertLevelChip(alertLevel: _incident.alertLevel),
            StatusChip(status: _incident.status),
          ]),
          const SizedBox(height: 12),
          _AssignmentSummaryCard(
            incident: _incident,
            isAcknowledging: _isAcknowledgingAssignment,
            onAcknowledge: _acknowledgeAssignment,
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Alert Level Assessment',
                      style: TextStyle(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  const Text(
                    'Confirm urgency from current field conditions.',
                    style: TextStyle(color: AppColors.mutedText),
                  ),
                  if (_incident.alertLevelUpdatedAt != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Last confirmed ${formatDateTime(_incident.alertLevelUpdatedAt!)}${_incident.alertLevelUpdatedBy == null ? '' : ' by ${_incident.alertLevelUpdatedBy}'}${_incident.alertLevelUpdateSource == null ? '' : ' via ${_incident.alertLevelUpdateSource}'}',
                      style: const TextStyle(
                          color: AppColors.mutedText,
                          fontWeight: FontWeight.w700),
                    ),
                  ],
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _incident.isResponderTerminal
                          ? null
                          : _showAlertLevelSheet,
                      icon: const Icon(Icons.tune_outlined),
                      label: const Text('Update Alert Level'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          if (_incident.cameraCaptureUrl != null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Activation-Time Camera Capture',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(
                        _incident.cameraCaptureUrl!,
                        width: double.infinity,
                        height: 220,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Padding(
                          padding: EdgeInsets.all(18),
                          child: Text(
                              'The authorized camera capture is unavailable.'),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (_incident.voiceContextAvailable ||
              _incident.voiceUrl != null) ...[
            VoiceContextCard(incident: _incident),
            const SizedBox(height: 12),
          ],
          _BackupSection(
            incident: _incident,
            isCancelling: _isCancellingBackup,
            onRequest: _showBackupSheet,
            onCancel: _cancelBackup,
          ),
          const SizedBox(height: 12),
          _ResourcesSection(incident: _incident),
          const SizedBox(height: 12),
          _CollapsibleSectionCard(
            title: 'Incident & Location Details',
            icon: Icons.info_outline,
            children: [
              _DetailRow(label: 'Source Type', value: _incident.sourceType),
              _DetailRow(
                  label: 'Reporting Channel',
                  value: _incident.reportingChannel),
              if (_incident.reportingPersonOrSource != null)
                _DetailRow(
                    label: 'Reporter / Source',
                    value: _incident.reportingPersonOrSource!),
              if (_incident.reportingOffice != null)
                _DetailRow(
                    label: 'Reporting Office',
                    value: _incident.reportingOffice!),
              if (_incident.incidentSubtype != null)
                _DetailRow(
                    label: 'Incident Subtype',
                    value: _incident.incidentSubtype!),
              if (_incident.personsAffected != null)
                _DetailRow(
                    label: 'Persons Affected',
                    value: '${_incident.personsAffected}'),
              if (_incident.affectedPersonsCondition != null)
                _DetailRow(
                    label: 'Affected-person Condition',
                    value: _incident.affectedPersonsCondition!),
              if (_incident.deviceId != null)
                _DetailRow(label: 'Device ID', value: _incident.deviceId!),
              if (_incident.nodeLocation != null)
                _DetailRow(
                    label: 'Node Location', value: _incident.nodeLocation!),
              _DetailRow(
                  label: 'Reported',
                  value: formatDateTime(_incident.timestamp)),
              _DetailRow(label: 'Address', value: _incident.approximateAddress),
              if (_incident.landmark != null)
                _DetailRow(label: 'Landmark', value: _incident.landmark!),
              _DetailRow(label: 'Coordinates', value: _incident.coordinates),
            ],
          ),
          if (_incident.isIotGenerated) ...[
            const SizedBox(height: 12),
            _CollapsibleSectionCard(
              title: 'Node Buzzer',
              icon: _incident.buzzerActive
                  ? Icons.notifications_active_outlined
                  : Icons.notifications_off_outlined,
              initiallyExpanded: _incident.buzzerActive,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      _incident.buzzerActive
                          ? Icons.notifications_active_outlined
                          : Icons.notifications_off_outlined,
                      color: _incident.buzzerActive
                          ? AppColors.goRed
                          : AppColors.mutedText,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _incident.buzzerActive
                                ? 'Buzzer active on ${_incident.deviceId}'
                                : 'Buzzer inactive on ${_incident.deviceId}',
                            style: const TextStyle(fontWeight: FontWeight.w900),
                          ),
                          if (_incident.buzzerUpdatedAt != null)
                            Text(
                              'Last command: ${formatDateTime(_incident.buzzerUpdatedAt!)}',
                              style: const TextStyle(
                                color: AppColors.mutedText,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    style: !_incident.buzzerActive
                        ? FilledButton.styleFrom(
                            backgroundColor: AppColors.goRed)
                        : null,
                    onPressed: _isTogglingBuzzer ? null : _toggleBuzzer,
                    icon: Icon(
                      _incident.buzzerActive
                          ? Icons.notifications_off_outlined
                          : Icons.notifications_active_outlined,
                    ),
                    label: Text(
                      _isTogglingBuzzer
                          ? 'Sending Command...'
                          : _incident.buzzerActive
                              ? 'Deactivate Buzzer'
                              : 'Activate Buzzer',
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          _CollapsibleSectionCard(
            title:
                'Activity & Notes (${_incident.activityHistory.length + _incident.notes.length})',
            icon: Icons.history_outlined,
            children: [..._incident.activityHistory, ..._incident.notes]
                .map((note) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.notes_outlined,
                              size: 18, color: AppColors.mediumGreen),
                          const SizedBox(width: 8),
                          Expanded(child: Text(note)),
                        ],
                      ),
                    ))
                .toList(),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Field Evidence',
                      style: TextStyle(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  const Text(
                    'Attach an incident photo for the owning barangay and, when escalated, LT-MDRRMO coordinators.',
                    style: TextStyle(color: AppColors.mutedText),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _incident.isResponderTerminal ||
                              _isUploadingAttachment
                          ? null
                          : _showAttachmentSource,
                      icon: const Icon(Icons.add_a_photo_outlined),
                      label: Text(_isUploadingAttachment
                          ? 'Uploading...'
                          : 'Add Private Photo'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _BackupSection extends StatelessWidget {
  const _BackupSection({
    required this.incident,
    required this.isCancelling,
    required this.onRequest,
    required this.onCancel,
  });

  final Incident incident;
  final bool isCancelling;
  final VoidCallback onRequest;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final request = incident.backupRequest;
    final active = request?.status.isActive ?? false;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text('Backup Coordination',
                      style: TextStyle(fontWeight: FontWeight.w900)),
                ),
                if (request != null)
                  Chip(
                      label: Text(request.status.label),
                      visualDensity: VisualDensity.compact),
              ],
            ),
            const SizedBox(height: 8),
            if (request == null)
              const Text('No backup has been requested for this assignment.',
                  style: TextStyle(color: AppColors.mutedText))
            else ...[
              Text(request.reason,
                  style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(
                '${request.assistanceTypes.map((type) => type.label).join(', ')}\n${request.respondersNeeded} requested · ${request.confirmedResponders.length} confirmed · ${request.offers.length} offered',
                style: const TextStyle(color: AppColors.mutedText),
              ),
            ],
            const SizedBox(height: 10),
            if (!active && !incident.isResponderTerminal)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: onRequest,
                  icon: const Icon(Icons.group_add_outlined),
                  label: const Text('Request Backup'),
                ),
              ),
            if (active)
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: isCancelling ? null : onCancel,
                  icon: const Icon(Icons.cancel_outlined),
                  label: Text(
                      isCancelling ? 'Cancelling...' : 'Cancel Backup Request'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ResourcesSection extends StatelessWidget {
  const _ResourcesSection({required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final request = incident.backupRequest;
    final equipmentRequested = request != null &&
        request.status.isActive &&
        request.assistanceTypes.contains(BackupAssistanceType.equipmentVehicle);
    final resources = incident.assignedResources;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.fire_truck_outlined,
                    color: AppColors.setBlueDark),
                const SizedBox(width: 9),
                Expanded(
                  child: Text(
                    'Vehicles & Equipment',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                ),
                Text(
                  '${resources.length} assigned',
                  style: const TextStyle(
                    color: AppColors.mutedText,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Barangay dispatch assigns local resources. LT-MDRRMO may add municipal resources after escalation. Changes appear here live.',
              style: TextStyle(color: AppColors.mutedText),
            ),
            if (equipmentRequested) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: resources.isEmpty
                      ? AppColors.warningSoft
                      : AppColors.successSoft,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  resources.isEmpty
                      ? 'Equipment or vehicle support requested - awaiting dispatcher assignment.'
                      : 'Equipment or vehicle support requested - resource assigned.',
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ],
            if (resources.isEmpty) ...[
              const SizedBox(height: 14),
              const Center(
                child: Column(
                  children: [
                    Icon(Icons.no_transfer_outlined,
                        color: AppColors.mutedText),
                    SizedBox(height: 6),
                    Text(
                      'No vehicles or equipment assigned',
                      style: TextStyle(
                        color: AppColors.mutedText,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              const Divider(height: 24),
              ...resources.map((resource) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _AssignedResourceRow(resource: resource),
                  )),
            ],
          ],
        ),
      ),
    );
  }
}

class _AssignedResourceRow extends StatelessWidget {
  const _AssignedResourceRow({required this.resource});

  final ResponseResource resource;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.local_shipping_outlined, color: AppColors.mediumGreen),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${resource.id} - ${resource.unitName}',
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              Text(
                '${resource.type} - ${resource.agency}',
                style: const TextStyle(color: AppColors.mutedText),
              ),
              Text(
                'Base: ${resource.baseLocation}',
                style: const TextStyle(
                  color: AppColors.mutedText,
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (resource.notes.isNotEmpty) Text(resource.notes),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Chip(label: Text(resource.status.label)),
      ],
    );
  }
}

class _AssignmentSummaryCard extends StatelessWidget {
  const _AssignmentSummaryCard({
    required this.incident,
    required this.isAcknowledging,
    required this.onAcknowledge,
  });

  final Incident incident;
  final bool isAcknowledging;
  final VoidCallback onAcknowledge;

  @override
  Widget build(BuildContext context) {
    final responder = incident.assignedResponder.trim();
    final unit = incident.assignedUnit.trim();
    final activeAssignment = responder.isNotEmpty &&
        !responder.toLowerCase().startsWith('unassigned') &&
        unit.isNotEmpty &&
        !unit.toLowerCase().startsWith('unassigned');
    final previousResponders = incident.assignedResponders
        .where((name) => name != responder)
        .toSet()
        .toList();

    return Card(
      color: activeAssignment ? AppColors.setBlueSoft : null,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  activeAssignment
                      ? Icons.groups_outlined
                      : Icons.person_off_outlined,
                  color: AppColors.setBlueDark,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        activeAssignment
                            ? 'Current Response Assignment'
                            : 'No Current Assignment',
                        style: const TextStyle(
                          color: AppColors.setBlueDark,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        activeAssignment ? responder : 'Awaiting dispatch',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                      Text(
                        activeAssignment ? unit : 'No active unit assigned',
                        style: const TextStyle(color: AppColors.mutedText),
                      ),
                      if (activeAssignment) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Assigned by: ${incident.assignmentSource ?? 'Authorized NodeGuard dispatcher'}',
                          style: const TextStyle(
                            color: AppColors.mediumGreen,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        if (incident.barangayName != null)
                          Text(
                            'Owning barangay: ${incident.barangayName}',
                            style: const TextStyle(color: AppColors.mutedText),
                          ),
                      ],
                    ],
                  ),
                ),
                StatusChip(status: incident.status),
              ],
            ),
            if (!activeAssignment && previousResponders.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                'Previously assigned: ${previousResponders.join(', ')}',
                style: const TextStyle(
                  color: AppColors.mutedText,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
            const Divider(height: 22),
            if ((incident.assignmentInstructions ?? '').isNotEmpty) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.assignment_outlined,
                      size: 18, color: AppColors.mediumGreen),
                  const SizedBox(width: 7),
                  Expanded(
                    child: Text(
                      'Instructions: ${incident.assignmentInstructions}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
              const Divider(height: 22),
            ],
            if (activeAssignment &&
                incident.assignmentAcknowledgedAt == null) ...[
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: isAcknowledging ? null : onAcknowledge,
                  icon: const Icon(Icons.task_alt_outlined),
                  label: Text(isAcknowledging
                      ? 'Acknowledging...'
                      : 'Acknowledge Assignment'),
                ),
              ),
              const Divider(height: 22),
            ] else if (incident.assignmentAcknowledgedAt != null) ...[
              Text(
                'Acknowledged ${formatDateTime(incident.assignmentAcknowledgedAt!)}',
                style: const TextStyle(
                  color: AppColors.successGreen,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const Divider(height: 22),
            ],
            Row(
              children: [
                const Icon(Icons.place_outlined,
                    size: 18, color: AppColors.mediumGreen),
                const SizedBox(width: 7),
                Expanded(
                  child: Text(
                    '${incident.locationName} · ${formatDateTime(incident.timestamp)}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CollapsibleSectionCard extends StatelessWidget {
  const _CollapsibleSectionCard({
    required this.title,
    required this.icon,
    required this.children,
    this.initiallyExpanded = false,
  });

  final String title;
  final IconData icon;
  final List<Widget> children;
  final bool initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        initiallyExpanded: initiallyExpanded,
        leading: Icon(icon, color: AppColors.setBlueDark),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        childrenPadding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 340;
          final labelText = Text(label,
              style: const TextStyle(
                  color: AppColors.mutedText, fontWeight: FontWeight.w800));
          final valueText =
              Text(value, style: const TextStyle(fontWeight: FontWeight.w700));
          if (compact) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [labelText, const SizedBox(height: 3), valueText],
            );
          }
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 126, child: labelText),
              Expanded(child: valueText),
            ],
          );
        },
      ),
    );
  }
}
