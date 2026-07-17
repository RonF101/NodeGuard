import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nodeguard_personnel_app/models/alert_level.dart';
import 'package:nodeguard_personnel_app/models/backup_request.dart';
import 'package:nodeguard_personnel_app/models/incident.dart';
import 'package:nodeguard_personnel_app/widgets/alert_level_update_sheet.dart';
import 'package:nodeguard_personnel_app/widgets/request_backup_sheet.dart';
import 'package:nodeguard_personnel_app/widgets/status_update_sheet.dart';

Incident _incident(
  String id,
  IncidentAlertLevel alertLevel,
  DateTime reportedAt, {
  BackupRequest? backupRequest,
}) {
  return Incident(
    id: id,
    category: IncidentCategory.medical,
    locationName: 'La Trinidad',
    approximateAddress: 'Municipal Hall',
    deviceId: 'LT-NODE-001',
    nodeLocation: 'Municipal Hall Node',
    timestamp: reportedAt,
    alertLevel: alertLevel,
    status: IncidentStatus.responding,
    voiceContextAvailable: true,
    voiceDuration: '00:10',
    assignedUnit: 'MDRRMO Rescue Unit',
    assignedResponder: 'Ronie Delos Santos',
    description: 'Test incident',
    coordinates: '16.46, 120.59',
    notes: const [],
    buzzerActive: false,
    buzzerUpdatedAt: null,
    backupRequest: backupRequest,
  );
}

BackupRequest _backup(String id, DateTime requestedAt) {
  return BackupRequest(
    id: id,
    incidentId: id,
    status: BackupRequestStatus.requested,
    requestedAt: requestedAt,
    requestedBy: 'profile-id',
    requestingTeam: 'MDRRMO Rescue Unit',
    assistanceTypes: const [BackupAssistanceType.medical],
    respondersNeeded: 1,
    reason: 'Additional medical assistance required',
    urgency: IncidentAlertLevel.high,
    offers: const [],
  );
}

void main() {
  test('responder workflow only offers valid next response steps', () {
    expect(
      responderStatusTransitions(IncidentStatus.assigned),
      [IncidentStatus.enRoute],
    );
    expect(
      responderStatusTransitions(IncidentStatus.enRoute),
      [IncidentStatus.onScene],
    );
    expect(
      responderStatusTransitions(IncidentStatus.onScene),
      [IncidentStatus.responding, IncidentStatus.resolved],
    );
    expect(
      responderStatusTransitions(IncidentStatus.resolved),
      isEmpty,
    );
  });

  group('shared alert-level rules', () {
    test('Unassessed is first, followed by descending known urgency', () {
      expect(alertLevelOrder, const [
        IncidentAlertLevel.unassessed,
        IncidentAlertLevel.critical,
        IncidentAlertLevel.high,
        IncidentAlertLevel.moderate,
        IncidentAlertLevel.low,
      ]);
      final sorted = sortIncidentsByAlertLevel([
        _incident('LOW', IncidentAlertLevel.low, DateTime(2026, 7, 17, 9)),
        _incident(
            'CRITICAL', IncidentAlertLevel.critical, DateTime(2026, 7, 17, 10)),
        _incident('UNASSESSED', IncidentAlertLevel.unassessed,
            DateTime(2026, 7, 17, 8)),
      ]);
      expect(sorted.map((item) => item.id), ['UNASSESSED', 'CRITICAL', 'LOW']);
    });

    test('equal alert levels use newest report first and can be reversed', () {
      final incidents = [
        _incident(
            'HIGH-OLD', IncidentAlertLevel.high, DateTime(2026, 7, 17, 8)),
        _incident('LOW', IncidentAlertLevel.low, DateTime(2026, 7, 17, 11)),
        _incident(
            'HIGH-NEW', IncidentAlertLevel.high, DateTime(2026, 7, 17, 10)),
      ];
      expect(sortIncidentsByAlertLevel(incidents).map((item) => item.id),
          ['HIGH-NEW', 'HIGH-OLD', 'LOW']);
      expect(
          sortIncidentsByAlertLevel(incidents, reverse: true)
              .map((item) => item.id),
          ['LOW', 'HIGH-NEW', 'HIGH-OLD']);
    });

    test('backup requests use alert level then oldest waiting request', () {
      final sorted = sortBackupRequestIncidents([
        _incident(
          'HIGH-NEW',
          IncidentAlertLevel.high,
          DateTime(2026, 7, 17, 8),
          backupRequest: _backup('BR-NEW', DateTime(2026, 7, 17, 10)),
        ),
        _incident(
          'UNASSESSED',
          IncidentAlertLevel.unassessed,
          DateTime(2026, 7, 17, 7),
          backupRequest: _backup('BR-U', DateTime(2026, 7, 17, 11)),
        ),
        _incident(
          'HIGH-OLD',
          IncidentAlertLevel.high,
          DateTime(2026, 7, 17, 6),
          backupRequest: _backup('BR-OLD', DateTime(2026, 7, 17, 9)),
        ),
      ]);
      expect(sorted.map((item) => item.id),
          ['UNASSESSED', 'HIGH-OLD', 'HIGH-NEW']);
    });
  });

  testWidgets('assigned responder can update an alert level with a reason',
      (tester) async {
    Incident? updated;
    final incident = _incident(
      'NG-TEST-1',
      IncidentAlertLevel.unassessed,
      DateTime(2026, 7, 17, 10),
    );
    await tester.pumpWidget(_SheetTestApp(
      incident: incident,
      onUpdated: (value) => updated = value,
      alertLevel: true,
    ));
    await tester.tap(find.text('Open Sheet'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<IncidentAlertLevel>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Critical').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Multiple victims reported');
    await tester.tap(find.text('Confirm Alert Level'));
    await tester.pumpAndSettle();
    expect(updated?.alertLevel, IncidentAlertLevel.critical);
    expect(updated?.alertLevelUpdateSource, 'Personnel Application');
  });

  testWidgets('backup request requires responder type and reason then submits',
      (tester) async {
    Incident? updated;
    final incident = _incident(
      'NG-TEST-2',
      IncidentAlertLevel.high,
      DateTime(2026, 7, 17, 10),
    );
    await tester.pumpWidget(_SheetTestApp(
      incident: incident,
      onUpdated: (value) => updated = value,
      alertLevel: false,
    ));
    await tester.tap(find.text('Open Sheet'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilterChip, 'Medical Responders'));
    await tester.enterText(
        find.byType(TextField), 'Additional medical assistance required');
    await tester.ensureVisible(find.text('Confirm Backup Request'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm Backup Request'));
    await tester.pumpAndSettle();
    expect(updated?.backupRequest?.status, BackupRequestStatus.requested);
    expect(updated?.backupRequest?.assistanceTypes,
        [BackupAssistanceType.medical]);
    expect(updated?.backupRequest?.reason,
        'Additional medical assistance required');
  });
}

class _SheetTestApp extends StatelessWidget {
  const _SheetTestApp({
    required this.incident,
    required this.onUpdated,
    required this.alertLevel,
  });

  final Incident incident;
  final ValueChanged<Incident> onUpdated;
  final bool alertLevel;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: Builder(
          builder: (context) => Center(
            child: FilledButton(
              onPressed: () => showModalBottomSheet<void>(
                context: context,
                isScrollControlled: true,
                builder: (_) => alertLevel
                    ? AlertLevelUpdateSheet(
                        incident: incident,
                        onUpdated: onUpdated,
                      )
                    : RequestBackupSheet(
                        incident: incident,
                        onRequested: onUpdated,
                      ),
              ),
              child: const Text('Open Sheet'),
            ),
          ),
        ),
      ),
    );
  }
}
