import 'package:flutter/material.dart';

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
  final void Function(IncidentStatus status, String remarks) onSubmit;

  @override
  State<StatusUpdateSheet> createState() => _StatusUpdateSheetState();
}

class _StatusUpdateSheetState extends State<StatusUpdateSheet> {
  late IncidentStatus _selectedStatus = widget.incident.status;
  final _remarksController = TextEditingController();

  @override
  void dispose() {
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
      IncidentStatus.falseAlert,
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
                  return ChoiceChip(
                    selected: selected,
                    label: Text(status.label),
                    avatar: selected ? const Icon(Icons.check, size: 18) : null,
                    selectedColor: status.color.withValues(alpha: 0.18),
                    side: BorderSide(
                        color: selected ? status.color : AppColors.border),
                    onSelected: (_) => setState(() => _selectedStatus = status),
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
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: () {
                  widget.onSubmit(
                      _selectedStatus, _remarksController.text.trim());
                  Navigator.pop(context);
                },
                icon: const Icon(Icons.send_outlined),
                label: const Text('Submit Update'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
