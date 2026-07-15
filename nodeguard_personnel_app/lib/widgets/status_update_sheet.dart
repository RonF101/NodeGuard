import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/incident.dart';
import '../theme/app_colors.dart';
import 'status_chip.dart';

class StatusUpdateSheet extends StatefulWidget {
  const StatusUpdateSheet({
    super.key,
    required this.incident,
    required this.onSubmit,
  });

  final Incident incident;
  final Future<bool> Function(IncidentStatus status, String remarks) onSubmit;

  @override
  State<StatusUpdateSheet> createState() => _StatusUpdateSheetState();
}

class _StatusUpdateSheetState extends State<StatusUpdateSheet> {
  late IncidentStatus _selectedStatus = widget.incident.status;
  final _remarksController = TextEditingController();
  bool _isSubmitting = false;
  bool _draftSaved = false;
  bool _restoringDraft = false;
  String? _error;
  Timer? _draftTimer;

  String get _draftKey => 'nodeguard.status-draft.${widget.incident.id}';

  @override
  void initState() {
    super.initState();
    _remarksController.addListener(_scheduleDraftSave);
    unawaited(_restoreDraft());
  }

  Future<void> _restoreDraft() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_draftKey);
    if (raw == null) return;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return;
      final data = Map<String, dynamic>.from(decoded);
      final statusName = data['status'] as String?;
      final restoredStatus = IncidentStatus.values.where(
        (item) => item.name == statusName,
      );
      if (!mounted) return;
      _restoringDraft = true;
      _remarksController.text = data['remarks'] as String? ?? '';
      _restoringDraft = false;
      setState(() {
        if (restoredStatus.isNotEmpty) _selectedStatus = restoredStatus.first;
        _draftSaved = true;
      });
    } on FormatException {
      await preferences.remove(_draftKey);
    }
  }

  void _scheduleDraftSave() {
    if (_restoringDraft) return;
    _draftTimer?.cancel();
    if (mounted) setState(() => _draftSaved = false);
    _draftTimer = Timer(const Duration(milliseconds: 350), () {
      unawaited(_saveDraft());
    });
  }

  Future<void> _saveDraft() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _draftKey,
      jsonEncode({
        'status': _selectedStatus.name,
        'remarks': _remarksController.text,
        'savedAt': DateTime.now().toIso8601String(),
      }),
    );
    if (mounted) setState(() => _draftSaved = true);
  }

  Future<bool> _confirmResolvedStatus() async {
    var reviewed = false;
    return await showDialog<bool>(
          context: context,
          barrierDismissible: false,
          builder: (dialogContext) => StatefulBuilder(
            builder: (context, setDialogState) => AlertDialog(
              title: const Text('Confirm incident resolution'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Resolving ${widget.incident.id} removes it from the active response queue.',
                  ),
                  const SizedBox(height: 12),
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: reviewed,
                    onChanged: (value) =>
                        setDialogState(() => reviewed = value ?? false),
                    title: const Text(
                      'I verified field conditions and reviewed the operational impact.',
                    ),
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
                  onPressed: reviewed
                      ? () => Navigator.pop(dialogContext, true)
                      : null,
                  child: const Text('Confirm Resolution'),
                ),
              ],
            ),
          ),
        ) ??
        false;
  }

  Future<void> _submit() async {
    if (_selectedStatus == IncidentStatus.needBackup &&
        _remarksController.text.trim().isEmpty) {
      setState(() {
        _error =
            'Describe the additional personnel, vehicle, or equipment needed.';
      });
      return;
    }
    if (_selectedStatus == IncidentStatus.resolved &&
        !await _confirmResolvedStatus()) {
      return;
    }
    setState(() {
      _isSubmitting = true;
      _error = null;
    });
    final saved = await widget.onSubmit(
      _selectedStatus,
      _remarksController.text.trim(),
    );
    if (!mounted) return;
    if (saved) {
      final preferences = await SharedPreferences.getInstance();
      await preferences.remove(_draftKey);
      if (!mounted) return;
      Navigator.pop(context);
      return;
    }
    setState(() {
      _isSubmitting = false;
      _error = 'The update was not saved. Please try again.';
    });
  }

  @override
  void dispose() {
    _draftTimer?.cancel();
    _remarksController.removeListener(_scheduleDraftSave);
    _remarksController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const options = [
      IncidentStatus.assigned,
      IncidentStatus.enRoute,
      IncidentStatus.onScene,
      IncidentStatus.responding,
      IncidentStatus.resolved,
      IncidentStatus.needBackup,
    ];

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(
          left: 16,
          right: 16,
          top: 14,
          bottom: MediaQuery.of(context).viewInsets.bottom + 16,
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
                      borderRadius: BorderRadius.circular(99)),
                ),
              ),
              const SizedBox(height: 16),
              Text('Update Response Status',
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text(widget.incident.id,
                  style: const TextStyle(
                      color: AppColors.mutedText, fontWeight: FontWeight.w800)),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: options.map((status) {
                  final selected = status == _selectedStatus;
                  return ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 48),
                    child: ChoiceChip(
                      selected: selected,
                      label: Text(status.label),
                      avatar:
                          selected ? const Icon(Icons.check, size: 18) : null,
                      selectedColor: status.color.withValues(alpha: 0.18),
                      side: BorderSide(
                          color: selected ? status.color : AppColors.border),
                      onSelected: (_) {
                        setState(() => _selectedStatus = status);
                        _scheduleDraftSave();
                      },
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _remarksController,
                minLines: 3,
                maxLines: 5,
                decoration: const InputDecoration(
                  labelText: 'Add field note or response update',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 14),
              StatusChip(status: _selectedStatus),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    _draftSaved
                        ? Icons.cloud_done_outlined
                        : Icons.edit_note_outlined,
                    size: 18,
                    color: AppColors.setBlue,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _draftSaved
                        ? 'Draft saved locally'
                        : 'Saving draft locally…',
                    style: const TextStyle(
                      color: AppColors.setBlueDark,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(
                  _error!,
                  style: const TextStyle(
                    color: AppColors.alertRed,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: _isSubmitting ? null : _submit,
                icon: const Icon(Icons.send_outlined),
                label:
                    Text(_isSubmitting ? 'Saving Update...' : 'Submit Update'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
