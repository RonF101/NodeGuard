import 'package:flutter/material.dart';

import '../services/operational_mode_service.dart';
import '../theme/app_colors.dart';

class ConnectivityBanner extends StatelessWidget {
  const ConnectivityBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final service = OperationalModeService.instance;
    return AnimatedBuilder(
      animation: service,
      builder: (context, _) {
        final offline = service.mode == OperationalMode.offline;
        final low = service.mode == OperationalMode.lowBandwidth;
        final label = offline
            ? 'Offline · Local Sync'
            : low
                ? 'Low-Bandwidth Mode'
                : 'Online · Synced';
        final helper = offline
            ? 'Status forms save locally; device commands wait for network.'
            : low
                ? 'Remote audio and external maps are deferred.'
                : 'Live operational data is available.';
        return SafeArea(
          bottom: false,
          child: Semantics(
            liveRegion: true,
            label: '$label. $helper',
            child: Container(
              width: double.infinity,
              constraints: const BoxConstraints(minHeight: 56),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: const BoxDecoration(
                color: AppColors.setBlueSoft,
                border: Border(bottom: BorderSide(color: AppColors.border)),
              ),
              child: Row(
                children: [
                  Icon(
                    offline
                        ? Icons.cloud_off_outlined
                        : low
                            ? Icons.network_check_outlined
                            : Icons.cloud_done_outlined,
                    color: AppColors.setBlueDark,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(label,
                            style: const TextStyle(
                                color: AppColors.navy,
                                fontWeight: FontWeight.w900)),
                        Text(
                          helper,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                              color: AppColors.mutedText, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  if (service.pendingCount > 0)
                    Container(
                      margin: const EdgeInsets.only(right: 4),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppColors.readyWhite,
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(color: AppColors.setBlue),
                      ),
                      child: Text(
                        '${service.pendingCount} queued',
                        style: const TextStyle(
                          color: AppColors.setBlueDark,
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  SizedBox(
                    width: 48,
                    height: 48,
                    child: Switch.adaptive(
                      value: service.manualLowBandwidth,
                      onChanged: offline
                          ? null
                          : (value) => service.setLowBandwidth(value),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
