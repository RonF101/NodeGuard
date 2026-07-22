import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nodeguard_personnel_app/app.dart';
import 'package:nodeguard_personnel_app/screens/main_shell.dart';
import 'package:nodeguard_personnel_app/screens/profile_screen.dart';
import 'package:nodeguard_personnel_app/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('NodeGuard Personnel splash loads', (WidgetTester tester) async {
    await tester.pumpWidget(const NodeGuardPersonnelApp());

    expect(find.text('NodeGuard Personnel'), findsOneWidget);
    expect(
        find.text('NodeGuard Assigned Responder Application'), findsOneWidget);
  });

  testWidgets('Login screen appears after splash delay',
      (WidgetTester tester) async {
    await tester.pumpWidget(const NodeGuardPersonnelApp());
    await tester.pump(const Duration(milliseconds: 1400));
    await tester.pumpAndSettle();

    expect(find.text('Authorized personnel only'), findsOneWidget);
    expect(find.text('Enter Demo Mode'), findsOneWidget);
  });

  testWidgets('personnel shell adapts between compact and wide screens',
      (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);

    tester.view.physicalSize = const Size(240, 700);
    await tester.pumpWidget(
      MaterialApp(theme: AppTheme.light, home: const MainShell()),
    );
    await tester.pumpAndSettle();

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
    expect(tester.takeException(), isNull);

    final compactNavigation =
        tester.widget<NavigationBar>(find.byType(NavigationBar));
    compactNavigation.onDestinationSelected?.call(4);
    await tester.pumpAndSettle();
    expect(find.byType(ProfileScreen), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();
    expect(find.text('Availability Status'), findsOneWidget);
    expect(tester.takeException(), isNull);

    tester.view.physicalSize = const Size(1280, 900);
    await tester.pump();

    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
