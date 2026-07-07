import 'package:flutter/material.dart';

import '../models/incident.dart';

class PriorityChip extends StatelessWidget {
  const PriorityChip({super.key, required this.priority});

  final IncidentPriority priority;

  @override
  Widget build(BuildContext context) {
    final color = priority.color;
    return Chip(
      visualDensity: VisualDensity.compact,
      backgroundColor: color.withValues(alpha: 0.12),
      side: BorderSide(color: color.withValues(alpha: 0.45)),
      label: Text(priority.label,
          style: TextStyle(color: color, fontWeight: FontWeight.w800)),
    );
  }
}
