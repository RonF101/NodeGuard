import 'package:flutter/material.dart';

import 'screens/splash_screen.dart';
import 'theme/app_theme.dart';

class NodeGuardPersonnelApp extends StatelessWidget {
  const NodeGuardPersonnelApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'NodeGuard Personnel',
      theme: AppTheme.light,
      home: const SplashScreen(),
    );
  }
}
