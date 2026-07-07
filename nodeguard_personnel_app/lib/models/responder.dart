enum AvailabilityStatus { available, dispatched, busy, offline }

extension AvailabilityStatusLabel on AvailabilityStatus {
  String get label {
    switch (this) {
      case AvailabilityStatus.available:
        return 'Available';
      case AvailabilityStatus.dispatched:
        return 'Dispatched';
      case AvailabilityStatus.busy:
        return 'Busy';
      case AvailabilityStatus.offline:
        return 'Offline';
    }
  }
}

class Responder {
  const Responder({
    required this.name,
    required this.role,
    required this.agencyUnit,
    required this.contactNumber,
    required this.availability,
    required this.currentAssignment,
  });

  final String name;
  final String role;
  final String agencyUnit;
  final String contactNumber;
  final AvailabilityStatus availability;
  final String currentAssignment;

  Responder copyWith(
      {AvailabilityStatus? availability, String? currentAssignment}) {
    return Responder(
      name: name,
      role: role,
      agencyUnit: agencyUnit,
      contactNumber: contactNumber,
      availability: availability ?? this.availability,
      currentAssignment: currentAssignment ?? this.currentAssignment,
    );
  }
}
