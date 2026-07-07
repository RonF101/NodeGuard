import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/mock_incidents.dart';
import '../data/mock_responder.dart';
import '../models/incident.dart';
import '../models/responder.dart';
import '../services/nodeguard_repository.dart';
import '../services/supabase_service.dart';
import '../theme/app_colors.dart';
import 'active_alerts_screen.dart';
import 'history_screen.dart';
import 'home_screen.dart';
import 'incident_details_screen.dart';
import 'login_screen.dart';
import 'map_screen.dart';
import 'profile_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  final _repository = const NodeGuardRepository();
  int _selectedIndex = 0;
  late List<Incident> _assignedIncidents = List.of(mockIncidents)
      .where((incident) => incident.assignedResponder == mockResponder.name)
      .toList();
  late List<Incident> _allIncidents = List.of(mockIncidents);
  Responder _responder = mockResponder;
  bool _isLoading = true;
  bool _isBackendConfigured = SupabaseService.isConfigured;
  bool _hasLoadedSharedData = false;
  String? _lastAlertedAssignmentId;
  RealtimeChannel? _incidentChannel;
  RealtimeChannel? _responderChannel;
  RealtimeChannel? _deviceChannel;

  @override
  void initState() {
    super.initState();
    unawaited(_loadSharedData());
  }

  Future<void> _loadSharedData() async {
    final responder = await _repository.fetchResponder();
    final assignedIncidents = await _repository.fetchIncidents(
      assignedResponderName: responder.name,
      fallbackWhenAssignedEmpty: false,
    );
    final allIncidents = await _repository.fetchIncidents();
    if (!mounted) return;
    final previousAssignment = _responder.currentAssignment;
    setState(() {
      _assignedIncidents = assignedIncidents;
      _allIncidents = allIncidents;
      _responder = responder;
      _isBackendConfigured = _repository.isConfigured;
      _isLoading = false;
    });
    if (_hasLoadedSharedData &&
        responder.currentAssignment != previousAssignment &&
        responder.currentAssignment != 'No active assignment' &&
        responder.currentAssignment != _lastAlertedAssignmentId) {
      _showAssignmentAlert(responder.currentAssignment, assignedIncidents);
    }
    _hasLoadedSharedData = true;
    _subscribeToSharedData();
  }

  void _showAssignmentAlert(String assignmentId, List<Incident> incidents) {
    Incident? incident;
    for (final item in incidents) {
      if (item.id == assignmentId) {
        incident = item;
        break;
      }
    }
    if (incident == null || incident.isCompleted) return;
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
  }

  void _updateIncident(String id, IncidentStatus status, String remarks) {
    unawaited(_repository.submitIncidentStatusUpdate(
        publicId: id, status: status, remarks: remarks));
    setState(() {
      _assignedIncidents =
          _replaceIncidentStatus(_assignedIncidents, id, status, remarks);
      _allIncidents =
          _replaceIncidentStatus(_allIncidents, id, status, remarks);

      final active = _assignedIncidents
          .where((incident) => !incident.isCompleted)
          .toList();
      _responder = _responder.copyWith(
          currentAssignment:
              active.isEmpty ? 'No active assignment' : active.first.id);
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

  void _updateAvailability(AvailabilityStatus availability) {
    unawaited(_repository.updateAvailability(availability).then((updated) {
      if (!mounted || updated) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Availability was updated locally only. Supabase is not connected.'),
        ),
      );
    }));
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
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeScreen(
        incidents: _assignedIncidents,
        responder: _responder,
        onIncidentStatusChanged: _updateIncident,
      ),
      MapScreen(
        incidents:
            _allIncidents.where((incident) => !incident.isCompleted).toList(),
        onIncidentStatusChanged: _updateIncident,
      ),
      ActiveAlertsScreen(
        alerts:
            _allIncidents.where((incident) => !incident.isCompleted).toList(),
        onIncidentStatusChanged: _updateIncident,
      ),
      HistoryScreen(incidents: _allIncidents),
      ProfileScreen(
        responder: _responder,
        onAvailabilityChanged: _updateAvailability,
        onLogout: _logout,
      ),
    ];

    return Scaffold(
      body: Column(
        children: [
          if (_isLoading || !_isBackendConfigured)
            SafeArea(
              bottom: false,
              child: Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                color:
                    _isBackendConfigured ? AppColors.cream : AppColors.softGray,
                child: Text(
                  _isLoading
                      ? 'Loading shared NodeGuard data...'
                      : 'Offline prototype mode: configure Supabase dart-defines to connect live data.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      color: AppColors.deepGreen, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          Expanded(child: pages[_selectedIndex]),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) =>
            setState(() => _selectedIndex = index),
        indicatorColor: AppColors.cream,
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment),
              label: 'Home'),
          NavigationDestination(
              icon: Icon(Icons.map_outlined),
              selectedIcon: Icon(Icons.map),
              label: 'Map'),
          NavigationDestination(
              icon: Icon(Icons.notifications_outlined),
              selectedIcon: Icon(Icons.notifications),
              label: 'Alerts'),
          NavigationDestination(
              icon: Icon(Icons.history_outlined),
              selectedIcon: Icon(Icons.history),
              label: 'History'),
          NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile'),
        ],
      ),
    );
  }
}
