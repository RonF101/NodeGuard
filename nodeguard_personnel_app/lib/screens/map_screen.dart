import 'package:flutter/material.dart';

import '../data/mock_locations.dart';
import '../models/incident.dart';
import '../theme/app_colors.dart';
import '../widgets/map_placeholder.dart';
import '../widgets/status_chip.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({
    super.key,
    required this.incidents,
    required this.onIncidentStatusChanged,
    this.selectedIncident,
  });

  final List<Incident> incidents;
  final Incident? selectedIncident;
  final void Function(String id, IncidentStatus status, String remarks)
      onIncidentStatusChanged;

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  late Incident? _selectedIncident = widget.selectedIncident ??
      widget.incidents.firstWhere((incident) => !incident.isCompleted,
          orElse: () => widget.incidents.first);

  @override
  Widget build(BuildContext context) {
    final incident = _selectedIncident;
    return Scaffold(
      appBar: AppBar(title: const Text('Location Map')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          MapPlaceholder(incident: incident),
          const SizedBox(height: 14),
          if (incident != null)
            _IncidentLocationCard(
              incident: incident,
              onOpenRoute: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text(
                          'Route opening placeholder - map API not connected yet.')),
                );
              },
              onMarkEnRoute: () {
                widget.onIncidentStatusChanged(
                    incident.id,
                    IncidentStatus.enRoute,
                    'Responder marked en route from map screen.');
                setState(() => _selectedIncident =
                    incident.copyWith(status: IncidentStatus.enRoute));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('${incident.id} marked En Route')),
                );
              },
            ),
          const SizedBox(height: 16),
          Text('Node Locations',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          ...mockLocations.map(
            (location) => Card(
              child: ListTile(
                leading: const Icon(Icons.sensors_outlined,
                    color: AppColors.mediumGreen),
                title: Text(location.name,
                    style: const TextStyle(fontWeight: FontWeight.w900)),
                subtitle: Text(
                    '${location.deviceId} - ${location.approximateAddress}\n${location.coordinates}'),
                isThreeLine: true,
                trailing: Text(location.zone,
                    style: const TextStyle(
                        color: AppColors.mutedText,
                        fontWeight: FontWeight.w700)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _IncidentLocationCard extends StatelessWidget {
  const _IncidentLocationCard({
    required this.incident,
    required this.onOpenRoute,
    required this.onMarkEnRoute,
  });

  final Incident incident;
  final VoidCallback onOpenRoute;
  final VoidCallback onMarkEnRoute;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(incident.locationName,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontWeight: FontWeight.w900)),
                ),
                StatusChip(status: incident.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(incident.deviceId,
                style: const TextStyle(
                    color: AppColors.deepGreen, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text(incident.approximateAddress),
            const SizedBox(height: 4),
            Text(incident.coordinates,
                style: const TextStyle(color: AppColors.mutedText)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onOpenRoute,
                    icon: const Icon(Icons.route_outlined),
                    label: const Text('Open Route'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onMarkEnRoute,
                    icon: const Icon(Icons.directions_car_outlined),
                    label: const Text('Mark En Route'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => Navigator.of(context).maybePop(),
              icon: const Icon(Icons.arrow_back),
              label: const Text('Back to Incident'),
            ),
          ],
        ),
      ),
    );
  }
}
