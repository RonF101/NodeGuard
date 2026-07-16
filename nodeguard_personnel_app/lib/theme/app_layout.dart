import 'package:flutter/material.dart';

abstract final class AppLayout {
  static const double compactWidth = 360;
  static const double mediumWidth = 720;
  static const double navigationRailWidth = 840;
  static const double extendedRailWidth = 1180;
  static const double maxContentWidth = 1280;

  static EdgeInsets pagePadding(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < compactWidth) return const EdgeInsets.all(12);
    if (width >= mediumWidth) return const EdgeInsets.all(24);
    return const EdgeInsets.all(16);
  }

  static int summaryColumnCount(double width) {
    if (width < 340) return 1;
    if (width < mediumWidth) return 2;
    return 3;
  }
}
