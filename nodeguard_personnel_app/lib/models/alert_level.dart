import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

enum IncidentAlertLevel { unassessed, critical, high, moderate, low }

class AlertLevelConfiguration {
  const AlertLevelConfiguration({
    required this.value,
    required this.label,
    required this.rank,
    required this.sortingPriority,
    required this.color,
    required this.backgroundColor,
    required this.icon,
    required this.description,
  });

  final IncidentAlertLevel value;
  final String label;
  final int rank;
  final int sortingPriority;
  final Color color;
  final Color backgroundColor;
  final IconData icon;
  final String description;
}

const alertLevelOrder = <IncidentAlertLevel>[
  IncidentAlertLevel.unassessed,
  IncidentAlertLevel.critical,
  IncidentAlertLevel.high,
  IncidentAlertLevel.moderate,
  IncidentAlertLevel.low,
];

const alertLevelConfigurations = <IncidentAlertLevel, AlertLevelConfiguration>{
  IncidentAlertLevel.unassessed: AlertLevelConfiguration(
    value: IncidentAlertLevel.unassessed,
    label: 'Unassessed',
    rank: 5,
    sortingPriority: 0,
    color: Color(0xFF6B4F00),
    backgroundColor: Color(0xFFFFF4D6),
    icon: Icons.help_outline,
    description: 'Received and awaiting an authorized urgency assessment.',
  ),
  IncidentAlertLevel.critical: AlertLevelConfiguration(
    value: IncidentAlertLevel.critical,
    label: 'Critical',
    rank: 4,
    sortingPriority: 1,
    color: AppColors.alertRed,
    backgroundColor: Color(0xFFFDE8E7),
    icon: Icons.error_outline,
    description: 'Immediate threat to life or rapidly escalating danger.',
  ),
  IncidentAlertLevel.high: AlertLevelConfiguration(
    value: IncidentAlertLevel.high,
    label: 'High',
    rank: 3,
    sortingPriority: 2,
    color: Color(0xFF9A4B00),
    backgroundColor: Color(0xFFFFF0D5),
    icon: Icons.warning_amber_outlined,
    description: 'Urgent intervention is required for a serious situation.',
  ),
  IncidentAlertLevel.moderate: AlertLevelConfiguration(
    value: IncidentAlertLevel.moderate,
    label: 'Moderate',
    rank: 2,
    sortingPriority: 3,
    color: AppColors.setBlueDark,
    backgroundColor: Color(0xFFE8EEF4),
    icon: Icons.priority_high_outlined,
    description:
        'Timely attention is required without an immediate life threat.',
  ),
  IncidentAlertLevel.low: AlertLevelConfiguration(
    value: IncidentAlertLevel.low,
    label: 'Low',
    rank: 1,
    sortingPriority: 4,
    color: Color(0xFF2E6B3A),
    backgroundColor: Color(0xFFE7F4E8),
    icon: Icons.keyboard_arrow_down,
    description:
        'Minor or controlled situation requiring routine coordination.',
  ),
};

extension IncidentAlertLevelConfiguration on IncidentAlertLevel {
  AlertLevelConfiguration get configuration => alertLevelConfigurations[this]!;
  String get label => configuration.label;
  String get databaseValue =>
      this == IncidentAlertLevel.moderate ? 'medium' : name;
}

IncidentAlertLevel alertLevelFromDatabase(String? value) {
  switch (value) {
    case 'critical':
      return IncidentAlertLevel.critical;
    case 'high':
      return IncidentAlertLevel.high;
    case 'medium':
    case 'moderate':
      return IncidentAlertLevel.moderate;
    case 'low':
      return IncidentAlertLevel.low;
    default:
      return IncidentAlertLevel.unassessed;
  }
}

int compareAlertLevels(IncidentAlertLevel first, IncidentAlertLevel second) {
  return second.configuration.rank.compareTo(first.configuration.rank);
}
