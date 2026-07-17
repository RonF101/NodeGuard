import 'package:flutter/material.dart';

import '../models/alert_level.dart';
import '../models/incident.dart';
import '../services/nodeguard_repository.dart';
import '../theme/app_colors.dart';
import 'alert_level_chip.dart';

class AlertLevelUpdateSheet extends StatefulWidget {
  const AlertLevelUpdateSheet({
    super.key,
    required this.incident,
    required this.onUpdated,
  });

  final Incident incident;
  final ValueChanged<Incident> onUpdated;

  @override
  State<AlertLevelUpdateSheet> createState() => _AlertLevelUpdateSheetState();
}

class _AlertLevelUpdateSheetState extends State<AlertLevelUpdateSheet> {
  final _repository = const NodeGuardRepository();
  final _reasonController = TextEditingController();
  late IncidentAlertLevel _selectedLevel = widget.incident.alertLevel;
  bool _isSaving = false;
  String? _error;

  Future<void> _save() async {
    setState(() {
      _isSaving = true;
      _error = null;
    });
    try {
      await _repository.updateAlertLevel(
        publicId: widget.incident.id,
        alertLevel: _selectedLevel,
        reason: _reasonController.text,
      );
      if (!mounted) return;
      final now = DateTime.now();
      final reason = _reasonController.text.trim();
      final history = List<String>.of(widget.incident.activityHistory);
      if (_selectedLevel != widget.incident.alertLevel) {
        history.insert(
          0,
          'Alert level changed from ${widget.incident.alertLevel.label} to ${_selectedLevel.label} by the assigned responder via Personnel Application.${reason.isEmpty ? '' : ' Reason: $reason'}',
        );
      }
      widget.onUpdated(widget.incident.copyWith(
        alertLevel: _selectedLevel,
        alertLevelUpdatedAt: now,
        alertLevelUpdatedBy: widget.incident.assignedResponder,
        alertLevelUpdateSource: 'Personnel Application',
        alertLevelUpdateReason: reason.isEmpty ? null : reason,
        activityHistory: history,
      ));
      Navigator.pop(context);
    } on NodeGuardDataException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final configuration = _selectedLevel.configuration;
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
              Text('Update Alert Level',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text(
                '${widget.incident.id} · ${widget.incident.category.label}',
                style: const TextStyle(
                    color: AppColors.mutedText, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 14),
              Semantics(
                label: 'Select incident alert level',
                child: DropdownButtonFormField<IncidentAlertLevel>(
                  initialValue: _selectedLevel,
                  decoration: const InputDecoration(labelText: 'Alert level'),
                  items: alertLevelOrder
                      .map((level) => DropdownMenuItem(
                            value: level,
                            child: Text(level.label),
                          ))
                      .toList(),
                  onChanged: (level) => setState(
                    () => _selectedLevel = level ?? _selectedLevel,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(configuration.description,
                  style: const TextStyle(color: AppColors.mutedText)),
              const SizedBox(height: 10),
              AlertLevelChip(alertLevel: _selectedLevel),
              const SizedBox(height: 12),
              TextField(
                controller: _reasonController,
                maxLength: 500,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Assessment reason (optional)',
                  hintText: 'Example: Multiple victims reported',
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
                  onPressed: _isSaving ? null : _save,
                  icon: const Icon(Icons.sync_outlined),
                  label: Text(_isSaving ? 'Saving...' : 'Confirm Alert Level'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
