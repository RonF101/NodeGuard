class NotificationItem {
  const NotificationItem({
    required this.title,
    required this.message,
    required this.timestamp,
    required this.isRead,
  });

  final String title;
  final String message;
  final DateTime timestamp;
  final bool isRead;
}
