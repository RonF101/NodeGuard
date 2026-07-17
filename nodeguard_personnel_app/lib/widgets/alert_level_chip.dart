import 'package:flutter/material.dart';

import '../models/alert_level.dart';

class AlertLevelChip extends StatelessWidget {
  const AlertLevelChip({super.key, required this.alertLevel});

  final IncidentAlertLevel alertLevel;

  @override
  Widget build(BuildContext context) {
    final configuration = alertLevel.configuration;
    return Semantics(
      label: 'Alert level ${configuration.label}. ${configuration.description}',
      child: Chip(
        avatar: Icon(configuration.icon, color: configuration.color, size: 17),
        label: Text(
          configuration.label,
          style: TextStyle(
              color: configuration.color, fontWeight: FontWeight.w900),
        ),
        backgroundColor: configuration.backgroundColor,
        side: BorderSide(color: configuration.color.withValues(alpha: 0.32)),
        visualDensity: VisualDensity.compact,
      ),
    );
  }
}
