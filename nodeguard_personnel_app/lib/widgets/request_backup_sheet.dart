import 'package:flutter/material.dart';

import '../models/alert_level.dart';
import '../models/backup_request.dart';
import '../models/incident.dart';
import '../services/nodeguard_repository.dart';
import '../theme/app_colors.dart';
import 'alert_level_chip.dart';

class RequestBackupSheet extends StatefulWidget {
  const RequestBackupSheet({
    super.key,
    required this.incident,
    required this.onRequested,
  });

  final Incident incident;
  final ValueChanged<Incident> onRequested;

  @override
  State<RequestBackupSheet> createState() => _RequestBackupSheetState();
}

class _RequestBackupSheetState extends State<RequestBackupSheet> {
  final _repository = const NodeGuardRepository();
  final _reasonController = TextEditingController();
  final _selectedTypes = <BackupAssistanceType>{};
  int _respondersNeeded = 1;
  late IncidentAlertLevel _urgency =
      widget.incident.alertLevel == IncidentAlertLevel.unassessed
          ? IncidentAlertLevel.moderate
          : widget.incident.alertLevel;
  bool _isSubmitting = false;
  String? _error;

  Future<void> _submit() async {
    if (_selectedTypes.isEmpty || _reasonController.text.trim().isEmpty) {
      setState(() => _error =
          'Select at least one assistance type and enter a short situation update.');
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    try {
      final id = await _repository.requestBackup(
        publicId: widget.incident.id,
        assistanceTypes: _selectedTypes.toList(),
        respondersNeeded: _respondersNeeded,
        reason: _reasonController.text,
        urgency: _urgency,
      );
      if (!mounted) return;
      final request = BackupRequest(
        id: id,
        incidentId: widget.incident.id,
        status: BackupRequestStatus.requested,
        requestedAt: DateTime.now(),
        requestedBy: widget.incident.assignedResponder,
        requestingTeam: widget.incident.assignedUnit,
        assistanceTypes: _selectedTypes.toList(),
        respondersNeeded: _respondersNeeded,
        reason: _reasonController.text.trim(),
        urgency: _urgency,
        offers: const [],
      );
      widget.onRequested(widget.incident.copyWith(
        backupRequest: request,
        activityHistory: [
          'Backup requested by ${widget.incident.assignedUnit}: ${request.reason}',
          ...widget.incident.activityHistory,
        ],
      ));
      Navigator.pop(context);
    } on NodeGuardDataException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 14,
          bottom: MediaQuery.viewInsetsOf(context).bottom + 16,
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('Request Backup',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 10),
              _SummaryLine(label: 'Incident ID', value: widget.incident.id),
              _SummaryLine(
                  label: 'Category', value: widget.incident.category.label),
              _SummaryLine(
                  label: 'Location', value: widget.incident.locationName),
              _SummaryLine(
                  label: 'Requesting team',
                  value: widget.incident.assignedUnit),
              const SizedBox(height: 6),
              AlertLevelChip(alertLevel: widget.incident.alertLevel),
              const SizedBox(height: 14),
              const Text('Type of assistance needed',
                  style: TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(height: 6),
              Semantics(
                label: 'Select one or more required responder types',
                child: Wrap(
                  spacing: 7,
                  runSpacing: 7,
                  children: BackupAssistanceType.values.map((type) {
                    final selected = _selectedTypes.contains(type);
                    return FilterChip(
                      selected: selected,
                      label: Text(type.label),
                      onSelected: (value) => setState(() {
                        if (value) {
                          _selectedTypes.add(type);
                        } else {
                          _selectedTypes.remove(type);
                        }
                      }),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  const Expanded(
                    child: Text('Additional personnel requested',
                        style: TextStyle(fontWeight: FontWeight.w800)),
                  ),
                  IconButton(
                    onPressed: _respondersNeeded > 1
                        ? () => setState(() => _respondersNeeded--)
                        : null,
                    tooltip: 'Decrease requested personnel',
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                  Text('$_respondersNeeded',
                      style: const TextStyle(fontWeight: FontWeight.w900)),
                  IconButton(
                    onPressed: _respondersNeeded < 99
                        ? () => setState(() => _respondersNeeded++)
                        : null,
                    tooltip: 'Increase requested personnel',
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
              DropdownButtonFormField<IncidentAlertLevel>(
                initialValue: _urgency,
                decoration:
                    const InputDecoration(labelText: 'Backup request urgency'),
                items: alertLevelOrder
                    .where((level) => level != IncidentAlertLevel.unassessed)
                    .map((level) => DropdownMenuItem(
                          value: level,
                          child: Text(level.label),
                        ))
                    .toList(),
                onChanged: (value) =>
                    setState(() => _urgency = value ?? _urgency),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _reasonController,
                maxLength: 500,
                minLines: 3,
                maxLines: 5,
                decoration: const InputDecoration(
                  labelText: 'Situation update or reason',
                  hintText: 'Example: Additional medical assistance required',
                  alignLabelWithHint: true,
                ),
              ),
              if (_error != null) ...[
                Text(_error!,
                    style: const TextStyle(
                        color: AppColors.alertRed,
                        fontWeight: FontWeight.w800)),
                const SizedBox(height: 10),
              ],
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _isSubmitting ? null : _submit,
                  icon: const Icon(Icons.group_add_outlined),
                  label: Text(_isSubmitting
                      ? 'Submitting...'
                      : 'Confirm Backup Request'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryLine extends StatelessWidget {
  const _SummaryLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Text('$label: $value',
          style: const TextStyle(fontWeight: FontWeight.w700)),
    );
  }
}
