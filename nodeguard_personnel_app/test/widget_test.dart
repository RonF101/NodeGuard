import 'package:flutter_test/flutter_test.dart';
import 'package:nodeguard_personnel_app/app.dart';

void main() {
  testWidgets('NodeGuard Personnel splash loads', (WidgetTester tester) async {
    await tester.pumpWidget(const NodeGuardPersonnelApp());

    expect(find.text('NodeGuard Personnel'), findsOneWidget);
    expect(find.text('La Trinidad MDRRMO Emergency Response Application'),
        findsOneWidget);
  });

  testWidgets('Login screen appears after splash delay',
      (WidgetTester tester) async {
    await tester.pumpWidget(const NodeGuardPersonnelApp());
    await tester.pump(const Duration(milliseconds: 1400));
    await tester.pumpAndSettle();

    expect(find.text('Authorized personnel only'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
  });
}
