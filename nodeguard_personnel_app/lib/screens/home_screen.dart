import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../models/responder.dart';
import '../theme/app_colors.dart';
import '../theme/app_layout.dart';
import '../widgets/incident_card.dart';
import 'incident_details_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.incidents,
    required this.responder,
    required this.activeBackupRequests,
    required this.onIncidentStatusChanged,
    required this.onAvailabilityChanged,
    required this.onIncidentResolved,
  });

  final List<Incident> incidents;
  final Responder responder;
  final int activeBackupRequests;
  final IncidentStatusUpdateCallback onIncidentStatusChanged;
  final Future<void> Function(AvailabilityStatus availability)
      onAvailabilityChanged;
  final VoidCallback onIncidentResolved;

  @override
  Widget build(BuildContext context) {
    final activeIncidents =
        incidents.where((incident) => !incident.isCompleted).toList();
    final sortedIncidents = sortIncidentsByAlertLevel(activeIncidents);
    final active = activeIncidents.length;
    final inResponse = activeIncidents
        .where((incident) =>
            incident.status != IncidentStatus.assigned &&
            incident.status != IncidentStatus.newAlert)
        .length;
    final now = DateTime.now();
    final resolvedToday = incidents
        .where((incident) =>
            incident.isCompleted &&
            incident.timestamp.toLocal().year == now.year &&
            incident.timestamp.toLocal().month == now.month &&
            incident.timestamp.toLocal().day == now.day)
        .length;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('NodeGuard Personnel'),
            Text(
              '${responder.name} - ${responder.availability.label}',
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: AppColors.mutedText),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: AppLayout.pagePadding(context),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  const CircleAvatar(child: Icon(Icons.person_outline)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(responder.name,
                            style:
                                const TextStyle(fontWeight: FontWeight.w900)),
                        Text('${responder.role} · ${responder.agencyUnit}',
                            style: const TextStyle(color: AppColors.mutedText)),
                      ],
                    ),
                  ),
                  Column(
                    children: [
                      Switch.adaptive(
                        value: responder.availability ==
                            AvailabilityStatus.available,
                        onChanged: (value) => onAvailabilityChanged(
                          value
                              ? AvailabilityStatus.available
                              : AvailabilityStatus.busy,
                        ),
                      ),
                      Text(responder.availability.label,
                          style: const TextStyle(
                              fontSize: 11, fontWeight: FontWeight.w800)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final itemWidth = (constraints.maxWidth - 8) / 2;
                  return Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _HomeMetric(
                        width: itemWidth,
                        label: 'Active assignments',
                        value: '$active',
                        icon: Icons.assignment_outlined,
                        color: AppColors.deepGreen,
                      ),
                      _HomeMetric(
                        width: itemWidth,
                        label: 'In response',
                        value: '$inResponse',
                        icon: Icons.emergency_share_outlined,
                        color: AppColors.orange,
                      ),
                      _HomeMetric(
                        width: itemWidth,
                        label: 'Resolved today',
                        value: '$resolvedToday',
                        icon: Icons.check_circle_outline,
                        color: AppColors.successGreen,
                      ),
                      _HomeMetric(
                        width: itemWidth,
                        label: 'Backup requests',
                        value: '$activeBackupRequests',
                        icon: Icons.group_add_outlined,
                        color: AppColors.setBlue,
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 18),
          Text('Assigned Alerts',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          if (activeIncidents.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(18),
                child: Text('No alert is currently assigned to your team.'),
              ),
            ),
          ...sortedIncidents.map(
            (incident) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: IncidentCard(
                incident: incident,
                onViewDetails: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => IncidentDetailsScreen(
                        incidentId: incident.id,
                        incidents: incidents,
                        onIncidentStatusChanged: onIncidentStatusChanged,
                        onIncidentResolved: onIncidentResolved,
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeMetric extends StatelessWidget {
  const _HomeMetric({
    required this.width,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final double width;
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
          child: Row(
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(width: 8),
              Text(
                value,
                style: TextStyle(
                  color: color,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  label,
                  maxLines: 2,
                  style: const TextStyle(
                    color: AppColors.mutedText,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
