import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../theme/app_colors.dart';

class VoiceContextCard extends StatelessWidget {
  const VoiceContextCard({super.key, required this.incident});

  final Incident incident;

  @override
  Widget build(BuildContext context) {
    final available = incident.voiceContextAvailable;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            CircleAvatar(
              radius: 25,
              backgroundColor: available ? AppColors.orange : AppColors.border,
              child: Icon(
                available
                    ? Icons.play_arrow_rounded
                    : Icons.volume_off_outlined,
                color: available ? Colors.white : AppColors.mutedText,
                size: 32,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    available
                        ? 'Voice Context Available'
                        : 'Voice Context Not Available',
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    available
                        ? 'Duration ${incident.voiceDuration}'
                        : 'No audio captured for this incident',
                    style: const TextStyle(color: AppColors.mutedText),
                  ),
                ],
              ),
            ),
            const Icon(Icons.graphic_eq_outlined, color: AppColors.mediumGreen),
          ],
        ),
      ),
    );
  }
}
