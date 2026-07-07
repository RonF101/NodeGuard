import 'package:flutter/material.dart';

import '../models/incident.dart';

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.status});

  final IncidentStatus status;

  @override
  Widget build(BuildContext context) {
    final color = status.color;
    return Chip(
      visualDensity: VisualDensity.compact,
      backgroundColor: color.withValues(alpha: 0.12),
      side: BorderSide(color: color.withValues(alpha: 0.45)),
      label: Text(status.label,
          style: TextStyle(color: color, fontWeight: FontWeight.w800)),
    );
  }
}
