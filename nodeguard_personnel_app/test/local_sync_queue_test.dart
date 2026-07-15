import 'package:flutter_test/flutter_test.dart';
import 'package:nodeguard_personnel_app/models/incident.dart';
import 'package:nodeguard_personnel_app/services/local_sync_queue.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

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
}
