import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../models/responder.dart';
import '../theme/app_colors.dart';
import '../widgets/incident_card.dart';
import '../widgets/summary_card.dart';
import 'incident_details_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.incidents,
    required this.responder,
    required this.onIncidentStatusChanged,
  });

  final List<Incident> incidents;
  final Responder responder;
  final IncidentStatusUpdateCallback onIncidentStatusChanged;

  @override
  Widget build(BuildContext context) {
    final active = incidents.where((incident) => !incident.isCompleted).length;
    final resolvedToday = incidents
        .where(
            (incident) => incident.isCompleted && incident.timestamp.day == 6)
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
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              SummaryCard(
                  label: 'Assigned Alerts',
                  value: '${incidents.length}',
                  icon: Icons.assignment_outlined,
                  color: AppColors.deepGreen),
              const SizedBox(width: 10),
              SummaryCard(
                  label: 'Active Response',
                  value: '$active',
                  icon: Icons.emergency_share_outlined,
                  color: AppColors.orange),
              const SizedBox(width: 10),
              SummaryCard(
                  label: 'Resolved Today',
                  value: '$resolvedToday',
                  icon: Icons.check_circle_outline,
                  color: AppColors.successGreen),
            ],
          ),
          const SizedBox(height: 18),
          Text('Assigned Alerts',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          if (incidents.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(18),
                child: Text('No alert is currently assigned to your team.'),
              ),
            ),
          ...incidents.map(
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
