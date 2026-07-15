import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

enum IncidentCategory { medical, security, fireDisaster }

enum IncidentPriority { critical, high, medium, low }

enum IncidentStatus {
  newAlert,
  assigned,
  enRoute,
  onScene,
  responding,
  resolved,
  closed,
  needBackup,
  falseAlert
}

extension IncidentCategoryLabel on IncidentCategory {
  String get label {
    switch (this) {
      case IncidentCategory.medical:
        return 'Medical Emergency';
      case IncidentCategory.security:
        return 'Security/Public Safety';
      case IncidentCategory.fireDisaster:
        return 'Fire/Disaster Emergency';
    }
  }

  IconData get icon {
    switch (this) {
      case IncidentCategory.medical:
        return Icons.medical_services_outlined;
      case IncidentCategory.security:
        return Icons.shield_outlined;
      case IncidentCategory.fireDisaster:
        return Icons.local_fire_department_outlined;
    }
  }
}

extension IncidentPriorityLabel on IncidentPriority {
  String get label {
    switch (this) {
      case IncidentPriority.critical:
        return 'Critical';
      case IncidentPriority.high:
        return 'High';
      case IncidentPriority.medium:
        return 'Medium';
      case IncidentPriority.low:
        return 'Low';
    }
  }

  Color get color {
    switch (this) {
      case IncidentPriority.critical:
        return AppColors.alertRed;
      case IncidentPriority.high:
        return AppColors.setBlueDark;
      case IncidentPriority.medium:
        return AppColors.setBlue;
      case IncidentPriority.low:
        return AppColors.mutedText;
    }
  }
}

extension IncidentStatusLabel on IncidentStatus {
  String get label {
    switch (this) {
      case IncidentStatus.newAlert:
        return 'New Alert';
      case IncidentStatus.assigned:
        return 'Assigned';
      case IncidentStatus.enRoute:
        return 'En Route';
      case IncidentStatus.onScene:
        return 'On Scene';
      case IncidentStatus.responding:
        return 'Responding';
      case IncidentStatus.resolved:
        return 'Resolved';
      case IncidentStatus.closed:
        return 'Closed';
      case IncidentStatus.needBackup:
        return 'Need Backup';
      case IncidentStatus.falseAlert:
        return 'False Alert';
    }
  }

  Color get color {
    switch (this) {
      case IncidentStatus.newAlert:
        return AppColors.setBlueDark;
      case IncidentStatus.assigned:
        return AppColors.setBlueDark;
      case IncidentStatus.enRoute:
        return AppColors.setBlue;
      case IncidentStatus.onScene:
        return AppColors.goRed;
      case IncidentStatus.responding:
        return AppColors.goRed;
      case IncidentStatus.resolved:
        return AppColors.successGreen;
      case IncidentStatus.closed:
        return AppColors.mutedText;
      case IncidentStatus.needBackup:
        return AppColors.alertRed;
      case IncidentStatus.falseAlert:
        return AppColors.mutedText;
    }
  }
}

class Incident {
  const Incident({
    required this.id,
    required this.category,
    required this.locationName,
    required this.approximateAddress,
    required this.deviceId,
    required this.nodeLocation,
    required this.timestamp,
    required this.priority,
    required this.status,
    required this.voiceContextAvailable,
    required this.voiceDuration,
    required this.assignedUnit,
    required this.assignedResponder,
    required this.description,
    required this.coordinates,
    required this.notes,
    required this.buzzerActive,
    required this.buzzerUpdatedAt,
    this.voiceUrl,
    this.voiceTranscript,
  });

  final String id;
  final IncidentCategory category;
  final String locationName;
  final String approximateAddress;
  final String deviceId;
  final String nodeLocation;
  final DateTime timestamp;
  final IncidentPriority priority;
  final IncidentStatus status;
  final bool voiceContextAvailable;
  final String voiceDuration;
  final String assignedUnit;
  final String assignedResponder;
  final String description;
  final String coordinates;
  final List<String> notes;
  final bool buzzerActive;
  final DateTime? buzzerUpdatedAt;
  final String? voiceUrl;
  final String? voiceTranscript;

  bool get isCompleted =>
      status == IncidentStatus.resolved ||
      status == IncidentStatus.closed ||
      status == IncidentStatus.falseAlert;

  Incident copyWith({
    IncidentStatus? status,
    List<String>? notes,
    bool? buzzerActive,
    DateTime? buzzerUpdatedAt,
  }) {
    return Incident(
      id: id,
      category: category,
      locationName: locationName,
      approximateAddress: approximateAddress,
      deviceId: deviceId,
      nodeLocation: nodeLocation,
      timestamp: timestamp,
      priority: priority,
      status: status ?? this.status,
      voiceContextAvailable: voiceContextAvailable,
      voiceDuration: voiceDuration,
      assignedUnit: assignedUnit,
      assignedResponder: assignedResponder,
      description: description,
      coordinates: coordinates,
      notes: notes ?? this.notes,
      buzzerActive: buzzerActive ?? this.buzzerActive,
      buzzerUpdatedAt: buzzerUpdatedAt ?? this.buzzerUpdatedAt,
      voiceUrl: voiceUrl,
      voiceTranscript: voiceTranscript,
    );
  }
}

typedef IncidentStatusUpdateCallback = Future<bool> Function(
  String id,
  IncidentStatus status,
  String remarks,
);
