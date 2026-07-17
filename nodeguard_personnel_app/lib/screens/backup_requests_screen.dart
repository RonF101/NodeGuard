import 'package:flutter/material.dart';

import '../models/alert_level.dart';
import '../models/backup_request.dart';
import '../models/incident.dart';
import '../models/responder.dart';
import '../services/nodeguard_repository.dart';
import '../theme/app_colors.dart';
import '../theme/app_layout.dart';
import '../widgets/alert_level_chip.dart';

class BackupRequestsScreen extends StatefulWidget {
  const BackupRequestsScreen({
    super.key,
    required this.incidents,
    required this.responder,
    required this.onAvailabilityChanged,
  });

  final List<Incident> incidents;
  final Responder responder;
  final Future<void> Function(AvailabilityStatus availability)
      onAvailabilityChanged;

  @override
  State<BackupRequestsScreen> createState() => _BackupRequestsScreenState();
}

class _BackupRequestsScreenState extends State<BackupRequestsScreen>
    with SingleTickerProviderStateMixin {
  IncidentAlertLevel? _levelFilter;
  IncidentCategory? _categoryFilter;
  BackupAssistanceType? _typeFilter;
  String? _teamFilter;
  String _distanceFilter = 'All distances';

  List<Incident> _filtered(bool active) {
    final incidents = widget.incidents.where((incident) {
      final request = incident.backupRequest;
      if (request == null || request.status.isActive != active) return false;
      if (_levelFilter != null && incident.alertLevel != _levelFilter) {
        return false;
      }
      if (_categoryFilter != null && incident.category != _categoryFilter) {
        return false;
      }
      if (_typeFilter != null &&
          !request.assistanceTypes.contains(_typeFilter)) {
        return false;
      }
      if (_teamFilter != null && request.requestingTeam != _teamFilter) {
        return false;
      }
      return true;
    }).toList();
    return sortBackupRequestIncidents(incidents);
  }

  @override
  Widget build(BuildContext context) {
    final teams = widget.incidents
        .map((incident) => incident.backupRequest?.requestingTeam)
        .whereType<String>()
        .toSet()
        .toList()
      ..sort();
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Backup Requests'),
          bottom: const TabBar(
            tabs: [Tab(text: 'Active'), Tab(text: 'History')],
          ),
        ),
        body: Column(
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 6),
              child: Row(
                children: [
                  _FilterDropdown<IncidentAlertLevel?>(
                    label: 'Alert level',
                    value: _levelFilter,
                    items: [
                      const DropdownMenuItem(
                          value: null, child: Text('All levels')),
                      ...alertLevelOrder.map((level) => DropdownMenuItem(
                            value: level,
                            child: Text(level.label),
                          )),
                    ],
                    onChanged: (value) => setState(() => _levelFilter = value),
                  ),
                  _FilterDropdown<IncidentCategory?>(
                    label: 'Category',
                    value: _categoryFilter,
                    items: [
                      const DropdownMenuItem(
                          value: null, child: Text('All Categories')),
                      ...IncidentCategory.values.map((category) =>
                          DropdownMenuItem(
                              value: category, child: Text(category.label))),
                    ],
                    onChanged: (value) =>
                        setState(() => _categoryFilter = value),
                  ),
                  _FilterDropdown<BackupAssistanceType?>(
                    label: 'Responder type',
                    value: _typeFilter,
                    items: [
                      const DropdownMenuItem(
                          value: null, child: Text('All responder types')),
                      ...BackupAssistanceType.values.map((type) =>
                          DropdownMenuItem(
                              value: type, child: Text(type.label))),
                    ],
                    onChanged: (value) => setState(() => _typeFilter = value),
                  ),
                  _FilterDropdown<String?>(
                    label: 'Requesting team',
                    value: _teamFilter,
                    items: [
                      const DropdownMenuItem(
                          value: null, child: Text('All requesting teams')),
                      ...teams.map((team) =>
                          DropdownMenuItem(value: team, child: Text(team))),
                    ],
                    onChanged: (value) => setState(() => _teamFilter = value),
                  ),
                  _FilterDropdown<String>(
                    label: 'Distance',
                    value: _distanceFilter,
                    items: const [
                      DropdownMenuItem(
                          value: 'All distances', child: Text('All distances')),
                      DropdownMenuItem(
                          value: 'Distance unavailable',
                          child: Text('Distance unavailable')),
                    ],
                    onChanged: (value) => setState(
                        () => _distanceFilter = value ?? 'All distances'),
                  ),
                  TextButton.icon(
                    onPressed: () => setState(() {
                      _levelFilter = null;
                      _categoryFilter = null;
                      _typeFilter = null;
                      _teamFilter = null;
                      _distanceFilter = 'All distances';
                    }),
                    icon: const Icon(Icons.filter_alt_off_outlined),
                    label: const Text('Clear'),
                  ),
                ],
              ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                  _RequestList(
                    incidents: _filtered(true),
                    emptyMessage:
                        'No active backup requests match the selected filters.',
                    responder: widget.responder,
                    onAvailabilityChanged: widget.onAvailabilityChanged,
                  ),
                  _RequestList(
                    incidents: _filtered(false),
                    emptyMessage:
                        'No completed backup requests match the selected filters.',
                    responder: widget.responder,
                    onAvailabilityChanged: widget.onAvailabilityChanged,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterDropdown<T> extends StatelessWidget {
  const _FilterDropdown({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  final String label;
  final T value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: SizedBox(
        width: 190,
        child: DropdownButtonFormField<T>(
          initialValue: value,
          isExpanded: true,
          decoration: InputDecoration(labelText: label, isDense: true),
          items: items,
          onChanged: onChanged,
        ),
      ),
    );
  }
}

class _RequestList extends StatelessWidget {
  const _RequestList({
    required this.incidents,
    required this.emptyMessage,
    required this.responder,
    required this.onAvailabilityChanged,
  });

  final List<Incident> incidents;
  final String emptyMessage;
  final Responder responder;
  final Future<void> Function(AvailabilityStatus availability)
      onAvailabilityChanged;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: AppLayout.pagePadding(context),
      children: [
        const Text(
          'Unassessed requests appear first, followed by Critical, High, Moderate, and Low. Equal levels show the longest-waiting request first.',
          style: TextStyle(color: AppColors.mutedText),
        ),
        const SizedBox(height: 10),
        if (incidents.isEmpty)
          Card(
              child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Text(emptyMessage))),
        ...incidents.map((incident) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _BackupRequestCard(
                incident: incident,
                responder: responder,
                onAvailabilityChanged: onAvailabilityChanged,
              ),
            )),
      ],
    );
  }
}

class _BackupRequestCard extends StatelessWidget {
  const _BackupRequestCard({
    required this.incident,
    required this.responder,
    required this.onAvailabilityChanged,
  });

  final Incident incident;
  final Responder responder;
  final Future<void> Function(AvailabilityStatus availability)
      onAvailabilityChanged;

  @override
  Widget build(BuildContext context) {
    final request = incident.backupRequest!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(incident.id,
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w900)),
                      Text(incident.category.label,
                          style: const TextStyle(
                              color: AppColors.deepGreen,
                              fontWeight: FontWeight.w800)),
                    ],
                  ),
                ),
                AlertLevelChip(alertLevel: incident.alertLevel),
              ],
            ),
            const SizedBox(height: 10),
            _RequestLine(
                icon: Icons.place_outlined, text: incident.locationName),
            const _RequestLine(
                icon: Icons.near_me_outlined, text: 'Distance unavailable'),
            _RequestLine(
                icon: Icons.groups_outlined,
                text: 'Requesting team: ${request.requestingTeam}'),
            _RequestLine(
                icon: Icons.schedule_outlined,
                text:
                    'Requested ${_formatDateTime(request.requestedAt)} · ${_elapsed(request.requestedAt)} waiting'),
            _RequestLine(
                icon: Icons.group_add_outlined,
                text:
                    '${request.assistanceTypes.map((type) => type.label).join(', ')} · ${request.respondersNeeded} needed'),
            const SizedBox(height: 6),
            Text(request.reason,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(
              '${request.offers.length} offered · ${request.confirmedResponders.length} confirmed · ${request.status.label}',
              style: const TextStyle(
                  color: AppColors.mutedText, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => _BackupRequestDetailsScreen(
                      incident: incident,
                      responder: responder,
                      onAvailabilityChanged: onAvailabilityChanged,
                    ),
                  ),
                ),
                icon: const Icon(Icons.open_in_new_outlined),
                label: const Text('View Request'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BackupRequestDetailsScreen extends StatefulWidget {
  const _BackupRequestDetailsScreen({
    required this.incident,
    required this.responder,
    required this.onAvailabilityChanged,
  });

  final Incident incident;
  final Responder responder;
  final Future<void> Function(AvailabilityStatus availability)
      onAvailabilityChanged;

  @override
  State<_BackupRequestDetailsScreen> createState() =>
      _BackupRequestDetailsScreenState();
}

class _BackupRequestDetailsScreenState
    extends State<_BackupRequestDetailsScreen> {
  final _repository = const NodeGuardRepository();
  bool _isOffering = false;
  bool _offeredLocally = false;
  String? _error;

  Future<void> _offer() async {
    setState(() {
      _isOffering = true;
      _error = null;
    });
    try {
      await _repository
          .offerBackupAssistance(widget.incident.backupRequest!.id);
      if (!mounted) return;
      setState(() => _offeredLocally = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Assistance offered. Wait for MDRRMO dispatcher confirmation before deploying.',
          ),
        ),
      );
    } on NodeGuardDataException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _isOffering = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final incident = widget.incident;
    final request = incident.backupRequest!;
    final alreadyOffered = _offeredLocally ||
        request.offers.any(
          (offer) => offer.responderName == widget.responder.name,
        );
    final hasActiveAssignment =
        widget.responder.currentAssignment != 'No active assignment';
    final available =
        widget.responder.availability == AvailabilityStatus.available;
    return Scaffold(
      appBar: AppBar(title: Text('${incident.id} Backup')),
      body: ListView(
        padding: AppLayout.pagePadding(context),
        children: [
          AlertLevelChip(alertLevel: incident.alertLevel),
          const SizedBox(height: 12),
          _DetailCard(
            title: 'Request Details',
            children: [
              Text(incident.category.label,
                  style: const TextStyle(fontWeight: FontWeight.w900)),
              Text(incident.locationName),
              const Text('Distance unavailable',
                  style: TextStyle(color: AppColors.mutedText)),
              const SizedBox(height: 8),
              Text('Requesting team: ${request.requestingTeam}'),
              Text('Incident status: ${incident.status.label}'),
              Text('Backup status: ${request.status.label}'),
              Text(
                  'Needed: ${request.assistanceTypes.map((type) => type.label).join(', ')}'),
              Text('Additional personnel: ${request.respondersNeeded}'),
              const SizedBox(height: 8),
              Text(request.reason,
                  style: const TextStyle(fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 12),
          _DetailCard(
            title: 'Your Availability',
            children: [
              Text(
                  '${widget.responder.availability.label} · ${widget.responder.currentAssignment}'),
              if (!available)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'Only personnel marked Available can offer assistance.',
                    style: TextStyle(
                        color: AppColors.alertRed, fontWeight: FontWeight.w800),
                  ),
                ),
              if (!available && !hasActiveAssignment)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: OutlinedButton(
                    onPressed: () => widget
                        .onAvailabilityChanged(AvailabilityStatus.available),
                    child: const Text('Mark Me Available'),
                  ),
                ),
              if (hasActiveAssignment)
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'You already have an active assignment. Complete or coordinate that assignment before offering backup.',
                    style: TextStyle(color: AppColors.mutedText),
                  ),
                ),
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!,
                style: const TextStyle(
                    color: AppColors.alertRed, fontWeight: FontWeight.w800)),
          ],
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: !request.status.isActive ||
                    !available ||
                    hasActiveAssignment ||
                    alreadyOffered ||
                    _isOffering
                ? null
                : _offer,
            icon: const Icon(Icons.volunteer_activism_outlined),
            label: Text(alreadyOffered
                ? 'Assistance Offered'
                : _isOffering
                    ? 'Submitting...'
                    : 'Offer Assistance'),
          ),
          const SizedBox(height: 8),
          const Text(
            'Offering assistance does not authorize self-deployment. MDRRMO dispatcher confirmation is required.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.mutedText),
          ),
        ],
      ),
    );
  }
}

class _DetailCard extends StatelessWidget {
  const _DetailCard({required this.title, required this.children});
  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _RequestLine extends StatelessWidget {
  const _RequestLine({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.mediumGreen),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

String _formatDateTime(DateTime value) {
  final local = value.toLocal();
  final month = local.month.toString().padLeft(2, '0');
  final day = local.day.toString().padLeft(2, '0');
  final hour = local.hour.toString().padLeft(2, '0');
  final minute = local.minute.toString().padLeft(2, '0');
  return '${local.year}-$month-$day $hour:$minute';
}

String _elapsed(DateTime value) {
  final elapsed = DateTime.now().difference(value);
  if (elapsed.inMinutes < 60) return '${elapsed.inMinutes.clamp(0, 59)}m';
  if (elapsed.inHours < 24) {
    return '${elapsed.inHours}h ${elapsed.inMinutes % 60}m';
  }
  return '${elapsed.inDays}d ${elapsed.inHours % 24}h';
}
