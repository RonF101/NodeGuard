import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../theme/app_colors.dart';
import 'priority_chip.dart';
import 'status_chip.dart';

class IncidentCard extends StatelessWidget {
  const IncidentCard({
    super.key,
    required this.incident,
    required this.onViewDetails,
  });

  final Incident incident;
  final VoidCallback onViewDetails;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.orange.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(incident.category.icon, color: AppColors.orange),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        incident.id,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        incident.category.label,
                        style: const TextStyle(
                            color: AppColors.deepGreen,
                            fontWeight: FontWeight.w800),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _InfoLine(icon: Icons.place_outlined, text: incident.locationName),
            _InfoLine(
                icon: Icons.confirmation_number_outlined,
                text: incident.deviceId),
            _InfoLine(
                icon: Icons.schedule_outlined,
                text: formatDateTime(incident.timestamp)),
            _InfoLine(
              icon: incident.voiceContextAvailable
                  ? Icons.graphic_eq_outlined
                  : Icons.volume_off_outlined,
              text: incident.voiceContextAvailable
                  ? 'Voice context available'
                  : 'No voice context',
            ),
            const SizedBox(height: 10),
            Text(
              incident.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.mutedText),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                PriorityChip(priority: incident.priority),
                StatusChip(status: incident.status),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onViewDetails,
                icon: const Icon(Icons.open_in_new_outlined),
                label: const Text('View Details'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String formatDateTime(DateTime value) {
  final month = value.month.toString().padLeft(2, '0');
  final day = value.day.toString().padLeft(2, '0');
  final hour = value.hour.toString().padLeft(2, '0');
  final minute = value.minute.toString().padLeft(2, '0');
  return '${value.year}-$month-$day $hour:$minute';
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.mediumGreen),
          const SizedBox(width: 8),
          Expanded(
              child: Text(text,
                  style: const TextStyle(fontWeight: FontWeight.w700))),
        ],
      ),
    );
  }
}
