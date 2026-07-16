import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../services/nodeguard_repository.dart';
import '../services/operational_mode_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_layout.dart';
import '../widgets/incident_card.dart';
import '../widgets/map_placeholder.dart';
import '../widgets/priority_chip.dart';
import '../widgets/status_chip.dart';
import '../widgets/status_update_sheet.dart';
import '../widgets/voice_context_card.dart';
import 'map_screen.dart';

class IncidentDetailsScreen extends StatefulWidget {
  const IncidentDetailsScreen({
    super.key,
    required this.incidentId,
    required this.incidents,
    required this.onIncidentStatusChanged,
  });

  final String incidentId;
  final List<Incident> incidents;
  final IncidentStatusUpdateCallback onIncidentStatusChanged;

  @override
  State<IncidentDetailsScreen> createState() => _IncidentDetailsScreenState();
}

class _IncidentDetailsScreenState extends State<IncidentDetailsScreen> {
  final _repository = const NodeGuardRepository();
  bool _isTogglingBuzzer = false;
  late Incident _incident =
      widget.incidents.firstWhere((item) => item.id == widget.incidentId);

  void _showStatusSheet() {
    showModalBottomSheet<void>(
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
  }

  Future<void> _toggleBuzzer() async {
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
      deviceId: _incident.deviceId,
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_incident.id)),
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
            PriorityChip(priority: _incident.priority),
            StatusChip(status: _incident.status),
          ]),
          const SizedBox(height: 14),
          _SectionCard(
            title: 'Incident Information',
            children: [
              _DetailRow(label: 'Device ID', value: _incident.deviceId),
              _DetailRow(label: 'Node Location', value: _incident.nodeLocation),
              _DetailRow(
                  label: 'Timestamp',
                  value: formatDateTime(_incident.timestamp)),
              _DetailRow(label: 'Assigned Unit', value: _incident.assignedUnit),
              _DetailRow(
                  label: 'Assigned Responder',
                  value: _incident.assignedResponder),
              _DetailRow(label: 'Location', value: _incident.locationName),
              _DetailRow(label: 'Address', value: _incident.approximateAddress),
              _DetailRow(label: 'Coordinates', value: _incident.coordinates),
            ],
          ),
          const SizedBox(height: 12),
          VoiceContextCard(incident: _incident),
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Node Buzzer',
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
                      ? FilledButton.styleFrom(backgroundColor: AppColors.goRed)
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
          const SizedBox(height: 12),
          _SectionCard(
            title: 'Notes / Remarks',
            children: _incident.notes
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
          Text('Location Preview',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          MapPlaceholder(incident: _incident, compact: true),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => MapScreen(
                    incidents: widget.incidents,
                    selectedIncident: _incident,
                    onIncidentStatusChanged: widget.onIncidentStatusChanged,
                  ),
                ),
              );
            },
            icon: const Icon(Icons.map_outlined),
            label: const Text('View Location'),
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: _showStatusSheet,
            icon: const Icon(Icons.update_outlined),
            label: const Text('Update Response Status'),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            ...children,
          ],
        ),
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
