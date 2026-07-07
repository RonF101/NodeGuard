import '../models/notification_item.dart';

final mockNotifications = <NotificationItem>[
  NotificationItem(
    title: 'New incident assigned: NG-2026-071',
    message: 'Medical emergency assigned to MDRRMO Rescue Unit.',
    timestamp: DateTime(2026, 7, 6, 8, 43),
    isRead: false,
  ),
  NotificationItem(
    title: 'Status update requested',
    message: 'Dashboard requested an updated field note for NG-2026-070.',
    timestamp: DateTime(2026, 7, 6, 8, 25),
    isRead: false,
  ),
  NotificationItem(
    title: 'Responder assignment changed',
    message: 'BFP Response Team added to transport terminal incident.',
    timestamp: DateTime(2026, 7, 6, 8, 2),
    isRead: true,
  ),
  NotificationItem(
    title: 'Incident marked as high priority',
    message: 'NG-2026-069 priority was raised by MDRRMO dashboard.',
    timestamp: DateTime(2026, 7, 6, 7, 59),
    isRead: true,
  ),
];
