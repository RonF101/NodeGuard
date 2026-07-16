import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../theme/app_colors.dart';
import '../theme/app_layout.dart';
import '../widgets/incident_card.dart';
import 'incident_details_screen.dart';

class ActiveAlertsScreen extends StatelessWidget {
  const ActiveAlertsScreen({
    super.key,
    required this.alerts,
    required this.onIncidentStatusChanged,
  });

  final List<Incident> alerts;
  final IncidentStatusUpdateCallback onIncidentStatusChanged;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Active Alerts')),
      body: ListView(
        padding: AppLayout.pagePadding(context),
        children: [
          Text(
            'Current Active Alerts',
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            'All open NodeGuard alerts currently visible to field personnel.',
            style: TextStyle(color: AppColors.mutedText),
          ),
          const SizedBox(height: 12),
          if (alerts.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(18),
                child: Text('No active alerts at this time.'),
              ),
            ),
          ...alerts.map(
            (incident) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: IncidentCard(
                incident: incident,
                onViewDetails: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => IncidentDetailsScreen(
                        incidentId: incident.id,
                        incidents: alerts,
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
