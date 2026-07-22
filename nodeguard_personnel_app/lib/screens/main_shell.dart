import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/mock_incidents.dart';
import '../data/mock_responder.dart';
import '../models/incident.dart';
import '../models/backup_request.dart';
import '../models/responder.dart';
import '../services/nodeguard_repository.dart';
import '../services/local_sync_queue.dart';
import '../services/operational_mode_service.dart';
import '../services/supabase_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_layout.dart';
import 'backup_requests_screen.dart';
import 'history_screen.dart';
import 'home_screen.dart';
import 'incident_details_screen.dart';
import 'login_screen.dart';
import 'map_screen.dart';
import 'profile_screen.dart';
import '../widgets/connectivity_banner.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  final _repository = const NodeGuardRepository();
  final _localSyncQueue = const LocalSyncQueue();
  final _operationalMode = OperationalModeService.instance;
  int _selectedIndex = 0;
  late List<Incident> _assignedIncidents = SupabaseService.isConfigured
      ? <Incident>[]
      : List.of(mockIncidents)
          .where((incident) => incident.assignedResponder == mockResponder.name)
          .toList();
  late List<Incident> _allIncidents =
      SupabaseService.isConfigured ? <Incident>[] : List.of(mockIncidents);
  Responder _responder = mockResponder;
  bool _isLoading = true;
  bool _isBackendConfigured = SupabaseService.isConfigured;
  bool _hasLoadedSharedData = false;
  String? _loadError;
  String? _lastAlertedAssignmentId;
  RealtimeChannel? _incidentChannel;
  RealtimeChannel? _responderChannel;
  RealtimeChannel? _deviceChannel;
  RealtimeChannel? _coordinationChannel;
  int _unreadBackupCount = 0;
  bool _isFlushingQueue = false;

  @override
  void initState() {
    super.initState();
    unawaited(_initializeOperationalData());
  }

  Future<void> _initializeOperationalData() async {
    await _operationalMode.initialize();
    _operationalMode.addListener(_handleOperationalModeChanged);
    if (_operationalMode.online) await _flushLocalQueue();
    await _loadSharedData();
  }

  void _handleOperationalModeChanged() {
    if (mounted) setState(() {});
    if (_operationalMode.online) unawaited(_flushLocalQueue());
  }

  Future<void> _flushLocalQueue() async {
    if (_isFlushingQueue ||
        !_operationalMode.online ||
        !_repository.isConfigured) {
      return;
    }
    _isFlushingQueue = true;
    final pending = await _localSyncQueue.load();
    if (pending.isEmpty) {
      _operationalMode.setPendingCount(0);
      _isFlushingQueue = false;
      return;
    }
    final remaining = <PendingStatusUpdate>[];
    var rejected = 0;
    String? rejectionReason;
    for (final update in pending) {
      final result = await _repository.submitIncidentStatusUpdate(
        publicId: update.publicId,
        status: update.status,
        remarks: update.remarks,
      );
      if (result.shouldRetry) {
        remaining.add(update);
      } else if (!result.saved) {
        rejected += 1;
        rejectionReason ??= result.message;
      }
    }
    await _localSyncQueue.save(remaining);
    _operationalMode.setPendingCount(remaining.length);
    _isFlushingQueue = false;
    if (!mounted) return;
    final synced = pending.length - remaining.length;
    if (synced > 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content:
                Text('$synced local update${synced == 1 ? '' : 's'} synced.')),
      );
      unawaited(_loadSharedData());
    }
    if (rejected > 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '$rejected outdated queued update${rejected == 1 ? '' : 's'} removed. '
            '${rejectionReason ?? 'The incident changed before the retry could be applied.'}',
          ),
        ),
      );
      unawaited(_loadSharedData());
    }
  }

  Future<void> _loadSharedData() async {
    try {
      final responder = await _repository.fetchResponder();
      final assignedIncidents = await _repository.fetchIncidents(
        assignedResponderName: responder.name,
      );
      final allIncidents = await _repository.fetchIncidents();
      final unreadBackupCount =
          await _repository.fetchUnreadBackupNotificationCount();
      if (!mounted) return;
      final previousAssignment = _responder.currentAssignment;
      setState(() {
        _assignedIncidents = assignedIncidents;
        _allIncidents = allIncidents;
        _responder = responder;
        _isBackendConfigured = _repository.isConfigured;
        _isLoading = false;
        _loadError = null;
        _unreadBackupCount = unreadBackupCount;
      });
      _operationalMode.markSynced();
      if (_hasLoadedSharedData &&
          responder.currentAssignment != previousAssignment &&
          responder.currentAssignment != 'No active assignment' &&
          responder.currentAssignment != _lastAlertedAssignmentId) {
        _showAssignmentAlert(responder.currentAssignment, assignedIncidents);
      }
      _hasLoadedSharedData = true;
      _subscribeToSharedData();
    } on NodeGuardDataException catch (error) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _loadError = error.message;
      });
    }
  }

  void _showAssignmentAlert(String assignmentId, List<Incident> incidents) {
    Incident? incident;
    for (final item in incidents) {
      if (item.id == assignmentId) {
        incident = item;
        break;
      }
    }
    if (incident == null || incident.isResponderTerminal) return;
    _lastAlertedAssignmentId = assignmentId;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('New Incident Assignment'),
          content: Text(
            incident == null
                ? '$assignmentId has been assigned to your team. Please check the Home tab.'
                : '${incident.id} - ${incident.category.label}\n${incident.locationName}\n\nYour team has been dispatched. Please review the incident details.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Dismiss'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                _openAssignedIncident(assignmentId);
              },
              child: const Text('View Assignment'),
            ),
          ],
        ),
      );
    });
  }

  void _openAssignedIncident(String assignmentId) {
    Incident? incident;
    for (final item in _assignedIncidents) {
      if (item.id == assignmentId) {
        incident = item;
        break;
      }
    }

    if (incident == null) {
      setState(() => _selectedIndex = 0);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              '$assignmentId is assigned to your team. It will appear on Home after syncing.'),
        ),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => IncidentDetailsScreen(
          incidentId: incident!.id,
          incidents: _assignedIncidents,
          onIncidentStatusChanged: _updateIncident,
          onIncidentResolved: () => setState(() => _selectedIndex = 3),
        ),
      ),
    );
  }

  void _subscribeToSharedData() {
    final client = SupabaseService.client;
    if (client == null || _incidentChannel != null) return;

    _incidentChannel = client
        .channel('nodeguard-personnel-incidents')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'incidents',
          callback: (_) => unawaited(_loadSharedData()),
        )
        .subscribe();
    _responderChannel = client
        .channel('nodeguard-personnel-responders')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'responders',
          callback: (_) => unawaited(_loadSharedData()),
        )
        .subscribe();
    _deviceChannel = client
        .channel('nodeguard-personnel-devices')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'device_locations',
          callback: (_) => unawaited(_loadSharedData()),
        )
        .subscribe();
    _coordinationChannel = client
        .channel('nodeguard-personnel-coordination')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'incident_priority_updates',
          callback: (_) => unawaited(_loadSharedData()),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'backup_requests',
          callback: (_) => unawaited(_loadSharedData()),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'backup_offers',
          callback: (_) => unawaited(_loadSharedData()),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'resource_assignments',
          callback: (_) => unawaited(_loadSharedData()),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'response_resources',
          callback: (_) => unawaited(_loadSharedData()),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'notifications',
          callback: (_) => unawaited(_loadSharedData()),
        )
        .subscribe();
  }

  void _selectDestination(int index) {
    setState(() => _selectedIndex = index);
    if (index == 2 && _unreadBackupCount > 0) {
      setState(() => _unreadBackupCount = 0);
      unawaited(_repository.markBackupNotificationsRead());
    }
  }

  Future<bool> _updateIncident(
      String id, IncidentStatus status, String remarks) async {
    if (!_operationalMode.online && _repository.isConfigured) {
      return _queueIncidentUpdate(id, status, remarks);
    }
    final result = await _repository.submitIncidentStatusUpdate(
        publicId: id, status: status, remarks: remarks);
    if (result.shouldRetry && _repository.isConfigured) {
      return _queueIncidentUpdate(id, status, remarks);
    }
    if (!result.saved) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.message ??
                  'This status update is no longer valid for the incident.',
            ),
          ),
        );
        unawaited(_loadSharedData());
      }
      return false;
    }
    if (!mounted) return false;
    _applyLocalIncidentUpdate(id, status, remarks);
    unawaited(_loadSharedData());
    return true;
  }

  Future<bool> _queueIncidentUpdate(
      String id, IncidentStatus status, String remarks) async {
    final count = await _localSyncQueue.add(PendingStatusUpdate(
      publicId: id,
      status: status,
      remarks: remarks,
      createdAt: DateTime.now(),
    ));
    _operationalMode.setPendingCount(count);
    if (!mounted) return false;
    _applyLocalIncidentUpdate(id, status, remarks);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
            'Saved locally · $count update${count == 1 ? '' : 's'} queued for sync.'),
      ),
    );
    return true;
  }

  void _applyLocalIncidentUpdate(
      String id, IncidentStatus status, String remarks) {
    setState(() {
      _assignedIncidents =
          _replaceIncidentStatus(_assignedIncidents, id, status, remarks);
      _allIncidents =
          _replaceIncidentStatus(_allIncidents, id, status, remarks);

      final active = _assignedIncidents
          .where((incident) => !incident.isResponderTerminal)
          .toList();
      _responder = _responder.copyWith(
          currentAssignment:
              active.isEmpty ? 'No active assignment' : active.first.id);
      if (status == IncidentStatus.resolved ||
          status == IncidentStatus.closed ||
          status == IncidentStatus.falseAlert ||
          status == IncidentStatus.unableToRespond) {
        _selectedIndex = 3;
      }
    });
  }

  List<Incident> _replaceIncidentStatus(
    List<Incident> incidents,
    String id,
    IncidentStatus status,
    String remarks,
  ) {
    return incidents.map((incident) {
      if (incident.id != id) return incident;
      final updatedNotes = List<String>.of(incident.notes);
      updatedNotes.insert(
          0,
          remarks.isEmpty
              ? 'Status updated to ${status.label}.'
              : '${status.label}: $remarks');
      return incident.copyWith(status: status, notes: updatedNotes);
    }).toList();
  }

  Future<void> _updateAvailability(AvailabilityStatus availability) async {
    final updated = await _repository.updateAvailability(availability);
    if (!mounted) return;
    if (!updated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Availability was not saved. Check the connection and try again.'),
        ),
      );
      return;
    }
    setState(
        () => _responder = _responder.copyWith(availability: availability));
  }

  void _logout() {
    final client = SupabaseService.client;
    if (client != null) {
      unawaited(client.auth.signOut());
    }
    Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  void dispose() {
    _operationalMode.removeListener(_handleOperationalModeChanged);
    final client = SupabaseService.client;
    if (client != null) {
      if (_incidentChannel != null) {
        unawaited(client.removeChannel(_incidentChannel!));
      }
      if (_responderChannel != null) {
        unawaited(client.removeChannel(_responderChannel!));
      }
      if (_deviceChannel != null) {
        unawaited(client.removeChannel(_deviceChannel!));
      }
      if (_coordinationChannel != null) {
        unawaited(client.removeChannel(_coordinationChannel!));
      }
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(
        incidents: _assignedIncidents,
        responder: _responder,
        activeBackupRequests: _allIncidents
            .where(
                (incident) => incident.backupRequest?.status.isActive ?? false)
            .length,
        onIncidentStatusChanged: _updateIncident,
        onAvailabilityChanged: _updateAvailability,
        onIncidentResolved: () => setState(() => _selectedIndex = 3),
      ),
      MapScreen(
        incidents: _allIncidents
            .where((incident) => !incident.isResponderTerminal)
            .toList(),
        onIncidentStatusChanged: _updateIncident,
      ),
      BackupRequestsScreen(
        incidents: _allIncidents,
        responder: _responder,
        onAvailabilityChanged: _updateAvailability,
      ),
      HistoryScreen(incidents: _allIncidents),
      ProfileScreen(
        responder: _responder,
        onAvailabilityChanged: _updateAvailability,
        onLogout: _logout,
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final useNavigationRail =
            constraints.maxWidth >= AppLayout.navigationRailWidth;
        final extendedRail =
            constraints.maxWidth >= AppLayout.extendedRailWidth;
        final compactNavigation = constraints.maxWidth < 420;

        return Scaffold(
          body: Column(
            children: [
              const ConnectivityBanner(),
              if (_isLoading || !_isBackendConfigured || _loadError != null)
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  color: AppColors.readyWhite,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Text(
                          _loadError ??
                              (_isLoading
                                  ? 'Loading shared NodeGuard data...'
                                  : 'Demo mode: configure Supabase dart-defines before operational deployment.'),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: AppColors.setBlueDark,
                              fontWeight: FontWeight.w800),
                        ),
                      ),
                      if (_loadError != null)
                        TextButton(
                          onPressed: () {
                            setState(() => _isLoading = true);
                            unawaited(_loadSharedData());
                          },
                          child: const Text('Retry'),
                        ),
                    ],
                  ),
                ),
              Expanded(
                child: Row(
                  children: [
                    if (useNavigationRail)
                      NavigationRail(
                        extended: extendedRail,
                        scrollable: true,
                        selectedIndex: _selectedIndex,
                        onDestinationSelected: _selectDestination,
                        labelType: extendedRail
                            ? NavigationRailLabelType.none
                            : NavigationRailLabelType.selected,
                        indicatorColor: AppColors.setBlueSoft,
                        destinations: [
                          const NavigationRailDestination(
                              icon: Icon(Icons.assignment_outlined),
                              selectedIcon: Icon(Icons.assignment),
                              label: Text('Home')),
                          const NavigationRailDestination(
                              icon: Icon(Icons.map_outlined),
                              selectedIcon: Icon(Icons.map),
                              label: Text('Map')),
                          NavigationRailDestination(
                              icon: _BackupBadge(
                                count: _unreadBackupCount,
                                child: const Icon(Icons.group_add_outlined),
                              ),
                              selectedIcon: _BackupBadge(
                                count: _unreadBackupCount,
                                child: const Icon(Icons.group_add),
                              ),
                              label: const Text('Backup')),
                          const NavigationRailDestination(
                              icon: Icon(Icons.history_outlined),
                              selectedIcon: Icon(Icons.history),
                              label: Text('History')),
                          const NavigationRailDestination(
                              icon: Icon(Icons.person_outline),
                              selectedIcon: Icon(Icons.person),
                              label: Text('Profile')),
                        ],
                      ),
                    if (useNavigationRail) const VerticalDivider(width: 1),
                    Expanded(
                      child: LayoutBuilder(
                        builder: (context, viewport) {
                          final width =
                              viewport.maxWidth > AppLayout.maxContentWidth
                                  ? AppLayout.maxContentWidth
                                  : viewport.maxWidth;
                          return Center(
                            child: SizedBox(
                              width: width,
                              height: viewport.maxHeight,
                              child: pages[_selectedIndex],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          bottomNavigationBar: useNavigationRail
              ? null
              : NavigationBar(
                  selectedIndex: _selectedIndex,
                  onDestinationSelected: _selectDestination,
                  indicatorColor: AppColors.setBlueSoft,
                  labelBehavior: compactNavigation
                      ? NavigationDestinationLabelBehavior.onlyShowSelected
                      : NavigationDestinationLabelBehavior.alwaysShow,
                  destinations: [
                    const NavigationDestination(
                        icon: Icon(Icons.assignment_outlined),
                        selectedIcon: Icon(Icons.assignment),
                        label: 'Home'),
                    const NavigationDestination(
                        icon: Icon(Icons.map_outlined),
                        selectedIcon: Icon(Icons.map),
                        label: 'Map'),
                    NavigationDestination(
                        icon: _BackupBadge(
                          count: _unreadBackupCount,
                          child: const Icon(Icons.group_add_outlined),
                        ),
                        selectedIcon: _BackupBadge(
                          count: _unreadBackupCount,
                          child: const Icon(Icons.group_add),
                        ),
                        label: 'Backup'),
                    const NavigationDestination(
                        icon: Icon(Icons.history_outlined),
                        selectedIcon: Icon(Icons.history),
                        label: 'History'),
                    const NavigationDestination(
                        icon: Icon(Icons.person_outline),
                        selectedIcon: Icon(Icons.person),
                        label: 'Profile'),
                  ],
                ),
        );
      },
    );
  }
}

class _BackupBadge extends StatelessWidget {
  const _BackupBadge({required this.count, required this.child});

  final int count;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return child;
    return Semantics(
      label: '$count unread active backup request${count == 1 ? '' : 's'}',
      child: Badge(
        label: Text(count > 99 ? '99+' : '$count'),
        child: child,
      ),
    );
  }
}
