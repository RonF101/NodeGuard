import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../services/nodeguard_repository.dart';
import '../theme/app_colors.dart';
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
  final void Function(String id, IncidentStatus status, String remarks)
      onIncidentStatusChanged;

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
        onSubmit: (status, remarks) {
          setState(() {
            final updatedNotes = List<String>.of(_incident.notes)
              ..insert(
                  0,
                  remarks.isEmpty
                      ? 'Status updated to ${status.label}.'
                      : '${status.label}: $remarks');
            _incident = _incident.copyWith(status: status, notes: updatedNotes);
          });
          widget.onIncidentStatusChanged(_incident.id, status, remarks);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text('${_incident.id} updated to ${status.label}')),
          );
        },
      ),
    );
  }

  Future<void> _toggleBuzzer() async {
    final nextActive = !_incident.buzzerActive;
    setState(() {
      _isTogglingBuzzer = true;
      _incident = _incident.copyWith(
        buzzerActive: nextActive,
        buzzerUpdatedAt: DateTime.now(),
      );
    });

    final updated = await _repository.setDeviceBuzzer(
      deviceId: _incident.deviceId,
      active: nextActive,
    );

    if (!mounted) return;
    setState(() => _isTogglingBuzzer = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          updated
              ? 'Node buzzer ${nextActive ? 'activated' : 'deactivated'}.'
              : 'Buzzer command saved locally only. Check Supabase setup.',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_incident.id)),
      body: ListView(
        padding: const EdgeInsets.all(16),
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
              Icon(_incident.category.icon, color: AppColors.orange, size: 30),
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
                        ? AppColors.orange
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
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 126,
            child: Text(label,
                style: const TextStyle(
                    color: AppColors.mutedText, fontWeight: FontWeight.w800)),
          ),
          Expanded(
              child: Text(value,
                  style: const TextStyle(fontWeight: FontWeight.w700))),
        ],
      ),
    );
  }
}
