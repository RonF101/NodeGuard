import 'package:flutter/material.dart';

import '../data/mock_locations.dart';
import '../models/incident.dart';
import '../theme/app_colors.dart';

class MapPlaceholder extends StatelessWidget {
  const MapPlaceholder({super.key, this.incident, this.compact = false});

  final Incident? incident;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = compact ? 190.0 : 280.0;
        const positions = [
          Offset(0.22, 0.24),
          Offset(0.42, 0.36),
          Offset(0.54, 0.52),
          Offset(0.70, 0.32),
          Offset(0.64, 0.70),
          Offset(0.32, 0.68),
        ];

        return Container(
          height: height,
          decoration: BoxDecoration(
            color: const Color(0xFFEAF0EC),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.border),
          ),
          child: Stack(
            children: [
              Positioned.fill(child: CustomPaint(painter: _MapGridPainter())),
              ...List.generate(mockLocations.length, (index) {
                final location = mockLocations[index];
                final active = incident?.deviceId == location.deviceId;
                final urgent = active &&
                    incident != null &&
                    [
                      IncidentStatus.onScene,
                      IncidentStatus.responding,
                      IncidentStatus.needBackup,
                    ].contains(incident!.status);
                final pos = positions[index];
                return Positioned(
                  left: (pos.dx * width).clamp(8, width - 92).toDouble(),
                  top: (pos.dy * height).clamp(8, height - 58).toDouble(),
                  child: _MapMarker(
                      label: location.name, active: active, urgent: urgent),
                );
              }),
              Positioned(
                left: 12,
                right: 12,
                bottom: 12,
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.94),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.map_outlined,
                          color: AppColors.deepGreen),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          incident == null
                              ? 'La Trinidad emergency node network preview'
                              : '${incident!.locationName} - ${incident!.deviceId}',
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _MapMarker extends StatelessWidget {
  const _MapMarker(
      {required this.label, required this.active, required this.urgent});

  final String label;
  final bool active;
  final bool urgent;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          Icons.location_on,
          color: urgent
              ? AppColors.goRed
              : active
                  ? AppColors.setBlue
                  : AppColors.successGreen,
          size: active ? 36 : 28,
        ),
        Container(
          constraints: const BoxConstraints(maxWidth: 88),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
                color: urgent
                    ? AppColors.goRed
                    : active
                        ? AppColors.setBlue
                        : AppColors.border),
          ),
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
          ),
        ),
      ],
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final roadPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 8
      ..strokeCap = StrokeCap.round;
    final minorPaint = Paint()
      ..color = AppColors.mediumGreen.withValues(alpha: 0.14)
      ..strokeWidth = 2;

    canvas.drawLine(Offset(size.width * 0.12, size.height * 0.22),
        Offset(size.width * 0.9, size.height * 0.8), roadPaint);
    canvas.drawLine(Offset(size.width * 0.18, size.height * 0.76),
        Offset(size.width * 0.84, size.height * 0.28), roadPaint);
    for (var i = 1; i < 5; i++) {
      final y = size.height * i / 5;
      canvas.drawLine(Offset(0, y), Offset(size.width, y + 18), minorPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
