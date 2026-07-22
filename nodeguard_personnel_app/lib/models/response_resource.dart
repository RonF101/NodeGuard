enum ResourceAvailability {
  available,
  dispatched,
  underMaintenance,
  unavailable,
  reserved,
}

extension ResourceAvailabilityLabel on ResourceAvailability {
  String get label {
    switch (this) {
      case ResourceAvailability.available:
        return 'Available';
      case ResourceAvailability.dispatched:
        return 'Assigned';
      case ResourceAvailability.underMaintenance:
        return 'Under Maintenance';
      case ResourceAvailability.unavailable:
        return 'Unavailable';
      case ResourceAvailability.reserved:
        return 'Reserved';
    }
  }
}

class ResponseResource {
  const ResponseResource({
    required this.id,
    required this.type,
    required this.unitName,
    required this.agency,
    required this.status,
    required this.baseLocation,
    required this.notes,
    this.availabilityNote,
  });

  final String id;
  final String type;
  final String unitName;
  final String agency;
  final ResourceAvailability status;
  final String baseLocation;
  final String notes;
  final String? availabilityNote;
}
