import 'package:flutter/material.dart';

import '../data/mock_notifications.dart';
import '../models/notification_item.dart';
import '../theme/app_colors.dart';
import '../widgets/incident_card.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('MDRRMO Dashboard Updates',
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          ...mockNotifications.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _NotificationCard(item: item),
              )),
        ],
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({required this.item});

  final NotificationItem item;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: item.isRead ? AppColors.border : AppColors.orange,
          child: Icon(
            item.isRead
                ? Icons.mark_email_read_outlined
                : Icons.notification_important_outlined,
            color: item.isRead ? AppColors.mutedText : Colors.white,
          ),
        ),
        title: Text(item.title,
            style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: Text('${item.message}\n${formatDateTime(item.timestamp)}'),
        isThreeLine: true,
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: item.isRead ? AppColors.softGray : AppColors.cream,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(item.isRead ? 'Read' : 'Unread',
              style:
                  const TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
        ),
      ),
    );
  }
}
