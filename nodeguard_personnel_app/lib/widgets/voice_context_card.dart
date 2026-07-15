import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/incident.dart';
import '../theme/app_colors.dart';
import '../services/operational_mode_service.dart';

class VoiceContextCard extends StatelessWidget {
  const VoiceContextCard({super.key, required this.incident});

  final Incident incident;

  Future<void> _openVoiceContext(BuildContext context) async {
    final url = incident.voiceUrl;
    if (url == null) return;
    final opened = await launchUrl(Uri.parse(url));
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Voice context could not be opened.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final service = OperationalModeService.instance;
    return AnimatedBuilder(
      animation: service,
      builder: (context, _) {
        final available = incident.voiceContextAvailable;
        final deferred = !service.online || service.lowBandwidth;
        final playable = incident.voiceUrl != null && !deferred;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 25,
                  backgroundColor:
                      available ? AppColors.setBlue : AppColors.border,
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
                            ? playable
                                ? 'Duration ${incident.voiceDuration} · tap play to open'
                                : deferred && incident.voiceUrl != null
                                    ? 'Media deferred · transcript remains available'
                                    : 'Recording metadata exists, but no playable file is available'
                            : 'No audio captured for this incident',
                        style: const TextStyle(color: AppColors.mutedText),
                      ),
                      if (incident.voiceTranscript?.isNotEmpty == true) ...[
                        const SizedBox(height: 6),
                        Text(
                          incident.voiceTranscript!,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  onPressed: playable ? () => _openVoiceContext(context) : null,
                  tooltip: playable
                      ? 'Open voice context'
                      : 'Voice file unavailable',
                  icon: Icon(
                    playable
                        ? Icons.play_circle_outline
                        : Icons.graphic_eq_outlined,
                    color: playable ? AppColors.setBlue : AppColors.mutedText,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
