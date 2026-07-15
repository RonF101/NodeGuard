import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/incident.dart';

class PendingStatusUpdate {
  const PendingStatusUpdate({
    required this.publicId,
    required this.status,
    required this.remarks,
    required this.createdAt,
  });

  final String publicId;
  final IncidentStatus status;
  final String remarks;
  final DateTime createdAt;

  Map<String, dynamic> toJson() => {
        'publicId': publicId,
        'status': status.name,
        'remarks': remarks,
        'createdAt': createdAt.toIso8601String(),
      };

  static PendingStatusUpdate? fromJson(Map<String, dynamic> json) {
    final publicId = json['publicId'];
    final statusName = json['status'];
    if (publicId is! String || statusName is! String) return null;
    final status = IncidentStatus.values
        .where((item) => item.name == statusName)
        .firstOrNull;
    if (status == null) return null;
    return PendingStatusUpdate(
      publicId: publicId,
      status: status,
      remarks: json['remarks'] as String? ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }
}

class LocalSyncQueue {
  const LocalSyncQueue();

  static const _storageKey = 'nodeguard.pending-status-updates.v1';

  Future<List<PendingStatusUpdate>> load() async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(_storageKey);
    if (raw == null) return <PendingStatusUpdate>[];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return <PendingStatusUpdate>[];
      return decoded
          .whereType<Map>()
          .map((item) =>
              PendingStatusUpdate.fromJson(Map<String, dynamic>.from(item)))
          .whereType<PendingStatusUpdate>()
          .toList();
    } on FormatException {
      return <PendingStatusUpdate>[];
    }
  }

  Future<int> add(PendingStatusUpdate update) async {
    final items = await load()
      ..add(update);
    await save(items);
    return items.length;
  }

  Future<void> save(List<PendingStatusUpdate> updates) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      _storageKey,
      jsonEncode(updates.map((item) => item.toJson()).toList()),
    );
  }
}
