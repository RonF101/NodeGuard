import 'package:flutter_test/flutter_test.dart';
import 'package:nodeguard_personnel_app/models/incident.dart';
import 'package:nodeguard_personnel_app/services/local_sync_queue.dart';
import 'package:nodeguard_personnel_app/services/nodeguard_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('historical assignments do not remain on the responder Home page', () {
    final incident = <String, dynamic>{
      'assigned_responder_name': null,
      'incident_assignments': [
        {
          'responders': {'name': 'Ronie Delos Santos'},
        },
      ],
    };

    expect(
      isCurrentResponderAssignment(incident, 'Ronie Delos Santos'),
      isFalse,
    );
    incident['assigned_responder_name'] = 'Ronie Delos Santos';
    expect(
      isCurrentResponderAssignment(incident, 'Ronie Delos Santos'),
      isTrue,
    );
  });

  test('only dispatcher-approved backup offers become current assignments', () {
    final incident = <String, dynamic>{
      'status': 'need_backup',
      'assigned_responder_name': 'EMS Team Alpha',
      'backup_requests': [
        {
          'backup_offers': [
            {
              'status': 'offered',
              'responders': {'name': 'Ronie Delos Santos'},
            },
          ],
        },
      ],
    };

    expect(
      isCurrentResponderAssignment(incident, 'Ronie Delos Santos'),
      isFalse,
    );
    (incident['backup_requests'] as List).first['backup_offers'][0]['status'] =
        'approved';
    expect(
      isCurrentResponderAssignment(incident, 'Ronie Delos Santos'),
      isTrue,
    );
    incident['status'] = 'resolved';
    expect(
      isCurrentResponderAssignment(incident, 'Ronie Delos Santos'),
      isFalse,
    );
  });

  test('database None value is normalized as no active assignment', () {
    expect(normalizeCurrentAssignment('None'), 'No active assignment');
    expect(normalizeCurrentAssignment(null), 'No active assignment');
    expect(normalizeCurrentAssignment('NG-2026-207'), 'NG-2026-207');
  });

  test('status updates survive a local queue round trip', () async {
    SharedPreferences.setMockInitialValues({});
    const queue = LocalSyncQueue();
    final createdAt = DateTime.utc(2026, 7, 16, 8, 30);

    final count = await queue.add(PendingStatusUpdate(
      publicId: 'NG-2026-001',
      status: IncidentStatus.enRoute,
      remarks: 'Departing from MDRRMC base.',
      createdAt: createdAt,
    ));
    final restored = await queue.load();

    expect(count, 1);
    expect(restored, hasLength(1));
    expect(restored.single.publicId, 'NG-2026-001');
    expect(restored.single.status, IncidentStatus.enRoute);
    expect(restored.single.remarks, 'Departing from MDRRMC base.');
    expect(restored.single.createdAt, createdAt);
  });

  test('duplicate status retries are replaced instead of accumulated',
      () async {
    SharedPreferences.setMockInitialValues({});
    const queue = LocalSyncQueue();

    await queue.add(PendingStatusUpdate(
      publicId: 'NG-2026-201',
      status: IncidentStatus.resolved,
      remarks: 'First attempt',
      createdAt: DateTime.utc(2026, 7, 17, 2, 58),
    ));
    final count = await queue.add(PendingStatusUpdate(
      publicId: 'NG-2026-201',
      status: IncidentStatus.resolved,
      remarks: 'Latest attempt',
      createdAt: DateTime.utc(2026, 7, 17, 3, 2),
    ));

    final restored = await queue.load();
    expect(count, 1);
    expect(restored, hasLength(1));
    expect(restored.single.remarks, 'Latest attempt');
    expect(restored.single.createdAt, DateTime.utc(2026, 7, 17, 3, 2));
  });
}
