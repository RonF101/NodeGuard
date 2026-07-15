import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'local_sync_queue.dart';

enum OperationalMode { online, lowBandwidth, offline }

class OperationalModeService extends ChangeNotifier {
  OperationalModeService._();

  static final instance = OperationalModeService._();
  static const _preferenceKey = 'nodeguard.low-bandwidth-mode';
  final _connectivity = Connectivity();
  final _queue = const LocalSyncQueue();
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  bool _connectionAvailable = true;
  bool _manualLowBandwidth = false;
  int _pendingCount = 0;

  bool get online => _connectionAvailable;
  bool get manualLowBandwidth => _manualLowBandwidth;
  bool get lowBandwidth => online && _manualLowBandwidth;
  int get pendingCount => _pendingCount;
  OperationalMode get mode => !online
      ? OperationalMode.offline
      : lowBandwidth
          ? OperationalMode.lowBandwidth
          : OperationalMode.online;

  Future<void> initialize() async {
    final preferences = await SharedPreferences.getInstance();
    _manualLowBandwidth = preferences.getBool(_preferenceKey) ?? false;
    _pendingCount = (await _queue.load()).length;
    _applyConnectivity(await _connectivity.checkConnectivity());
    _subscription ??=
        _connectivity.onConnectivityChanged.listen(_applyConnectivity);
    notifyListeners();
  }

  void _applyConnectivity(List<ConnectivityResult> results) {
    final next = results.any((result) => result != ConnectivityResult.none);
    if (next == _connectionAvailable) return;
    _connectionAvailable = next;
    notifyListeners();
  }

  Future<void> setLowBandwidth(bool enabled) async {
    _manualLowBandwidth = enabled;
    notifyListeners();
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool(_preferenceKey, enabled);
  }

  void setPendingCount(int count) {
    if (_pendingCount == count) return;
    _pendingCount = count;
    notifyListeners();
  }
}
