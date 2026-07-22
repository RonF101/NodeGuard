import 'package:flutter/material.dart';

import '../models/incident.dart';
import '../theme/app_colors.dart';
import '../theme/app_layout.dart';
import '../widgets/incident_card.dart';
import '../widgets/alert_level_chip.dart';
import '../widgets/status_chip.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key, required this.incidents});

  final List<Incident> incidents;

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String _dateFilter = 'All';
  IncidentCategory? _categoryFilter;
  IncidentStatus? _statusFilter;

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final completed =
        sortIncidentsByAlertLevel(widget.incidents.where((incident) {
      if (!incident.isResponderTerminal) {
        return false;
      }
      if (_dateFilter == 'Today') {
        final reported = incident.timestamp.toLocal();
        if (reported.year != today.year ||
            reported.month != today.month ||
            reported.day != today.day) {
          return false;
        }
      }
      if (_categoryFilter != null && incident.category != _categoryFilter) {
        return false;
      }
      if (_statusFilter != null && incident.status != _statusFilter) {
        return false;
      }
      return true;
    }));

    return Scaffold(
      appBar: AppBar(title: const Text('Incident History')),
      body: ListView(
        padding: AppLayout.pagePadding(context),
        children: [
          Text('Handled Incidents',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth >= 720
                  ? 3
                  : constraints.maxWidth >= 440
                      ? 2
                      : 1;
              final width =
                  (constraints.maxWidth - ((columns - 1) * 8)) / columns;
              return Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  SizedBox(
                    width: width,
                    child: DropdownButtonFormField<String>(
                      initialValue: _dateFilter,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Date'),
                      items: const [
                        DropdownMenuItem(
                            value: 'All', child: Text('All Dates')),
                        DropdownMenuItem(value: 'Today', child: Text('Today')),
                      ],
                      onChanged: (value) =>
                          setState(() => _dateFilter = value ?? 'All'),
                    ),
                  ),
                  SizedBox(
                    width: width,
                    child: DropdownButtonFormField<IncidentCategory?>(
                      initialValue: _categoryFilter,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: [
                        const DropdownMenuItem<IncidentCategory?>(
                            value: null, child: Text('All Categories')),
                        ...IncidentCategory.values.map((category) =>
                            DropdownMenuItem(
                                value: category,
                                child: Text(category.label,
                                    overflow: TextOverflow.ellipsis))),
                      ],
                      onChanged: (value) =>
                          setState(() => _categoryFilter = value),
                    ),
                  ),
                  SizedBox(
                    width: width,
                    child: DropdownButtonFormField<IncidentStatus?>(
                      initialValue: _statusFilter,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: const [
                        DropdownMenuItem<IncidentStatus?>(
                            value: null, child: Text('All Statuses')),
                        DropdownMenuItem(
                            value: IncidentStatus.resolved,
                            child: Text('Resolved')),
                        DropdownMenuItem(
                            value: IncidentStatus.closed,
                            child: Text('Closed')),
                      ],
                      onChanged: (value) =>
                          setState(() => _statusFilter = value),
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 12),
          if (completed.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(18),
                child:
                    Text('No completed incidents match the selected filters.'),
              ),
            ),
          ...completed.map((incident) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _HistoryCard(incident: incident),
              )),
        ],
      ),
    );
  }
}

class _HistoryCard extends StatelessWidget {
  const _HistoryCard({required this.incident});

  final Incident incident;

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
                  child: Text(incident.id,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.w900)),
                ),
                StatusChip(status: incident.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(incident.category.label,
                style: const TextStyle(
                    color: AppColors.deepGreen, fontWeight: FontWeight.w900)),
            const SizedBox(height: 6),
            Text(
                '${incident.locationName} - ${formatDateTime(incident.timestamp)}'),
            const SizedBox(height: 8),
            AlertLevelChip(alertLevel: incident.alertLevel),
            const SizedBox(height: 8),
            Text(
              incident.notes.isEmpty
                  ? 'No notes recorded.'
                  : incident.notes.first,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: AppColors.mutedText),
            ),
          ],
        ),
      ),
    );
  }
}
