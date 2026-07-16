import 'package:flutter/material.dart';

import '../models/responder.dart';
import '../theme/app_colors.dart';
import '../theme/app_layout.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    super.key,
    required this.responder,
    required this.onAvailabilityChanged,
    required this.onLogout,
  });

  final Responder responder;
  final void Function(AvailabilityStatus availability) onAvailabilityChanged;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: AppLayout.pagePadding(context),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                children: [
                  const CircleAvatar(
                    radius: 38,
                    backgroundColor: AppColors.deepGreen,
                    child: Icon(Icons.person, color: Colors.white, size: 42),
                  ),
                  const SizedBox(height: 12),
                  Text(responder.name,
                      style: Theme.of(context)
                          .textTheme
                          .titleLarge
                          ?.copyWith(fontWeight: FontWeight.w900)),
                  const SizedBox(height: 4),
                  Text(responder.agencyUnit,
                      style: const TextStyle(
                          color: AppColors.mutedText,
                          fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  _ProfileRow(label: 'Role', value: responder.role),
                  _ProfileRow(
                      label: 'Agency/Unit', value: responder.agencyUnit),
                  _ProfileRow(
                      label: 'Contact Number', value: responder.contactNumber),
                  _ProfileRow(
                      label: 'Availability',
                      value: responder.availability.label),
                  _ProfileRow(
                      label: 'Current Assignment',
                      value: responder.currentAssignment),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text('Availability Status',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          LayoutBuilder(
            builder: (context, constraints) {
              final vertical = constraints.maxWidth < 600;
              return SegmentedButton<AvailabilityStatus>(
                direction: vertical ? Axis.vertical : Axis.horizontal,
                expandedInsets: vertical ? null : EdgeInsets.zero,
                segments: const [
                  ButtonSegment(
                      value: AvailabilityStatus.available,
                      label: Text('Available'),
                      icon: Icon(Icons.check_circle_outline)),
                  ButtonSegment(
                      value: AvailabilityStatus.dispatched,
                      label: Text('Dispatched'),
                      icon: Icon(Icons.local_shipping_outlined)),
                  ButtonSegment(
                      value: AvailabilityStatus.busy,
                      label: Text('Busy'),
                      icon: Icon(Icons.timelapse_outlined)),
                  ButtonSegment(
                      value: AvailabilityStatus.offline,
                      label: Text('Offline'),
                      icon: Icon(Icons.power_settings_new)),
                ],
                selected: {responder.availability},
                onSelectionChanged: (selection) =>
                    onAvailabilityChanged(selection.first),
              );
            },
          ),
          const SizedBox(height: 18),
          OutlinedButton.icon(
            onPressed: onLogout,
            icon: const Icon(Icons.logout),
            label: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxWidth < 340;
          final labelText = Text(label,
              style: const TextStyle(
                  color: AppColors.mutedText, fontWeight: FontWeight.w800));
          final valueText =
              Text(value, style: const TextStyle(fontWeight: FontWeight.w800));
          if (compact) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [labelText, const SizedBox(height: 3), valueText],
            );
          }
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 134, child: labelText),
              Expanded(child: valueText),
            ],
          );
        },
      ),
    );
  }
}
