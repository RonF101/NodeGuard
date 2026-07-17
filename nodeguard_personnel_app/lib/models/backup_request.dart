import 'alert_level.dart';

enum BackupRequestStatus {
  requested,
  assistanceOffered,
  partiallyFilled,
  confirmed,
  fulfilled,
  cancelled,
  closed,
}

enum BackupOfferStatus { offered, approved, declined, withdrawn }

enum BackupAssistanceType {
  medical,
  fire,
  policePublicSafety,
  rescue,
  barangay,
  general,
  equipmentVehicle,
}

extension BackupRequestStatusLabel on BackupRequestStatus {
  String get label {
    switch (this) {
      case BackupRequestStatus.requested:
        return 'Requested';
      case BackupRequestStatus.assistanceOffered:
        return 'Assistance Offered';
      case BackupRequestStatus.partiallyFilled:
        return 'Partially Filled';
      case BackupRequestStatus.confirmed:
        return 'Confirmed';
      case BackupRequestStatus.fulfilled:
        return 'Fulfilled';
      case BackupRequestStatus.cancelled:
        return 'Cancelled';
      case BackupRequestStatus.closed:
        return 'Closed';
    }
  }

  bool get isActive => const {
        BackupRequestStatus.requested,
        BackupRequestStatus.assistanceOffered,
        BackupRequestStatus.partiallyFilled,
        BackupRequestStatus.confirmed,
      }.contains(this);
}

extension BackupAssistanceTypeLabel on BackupAssistanceType {
  String get label {
    switch (this) {
      case BackupAssistanceType.medical:
        return 'Medical Responders';
      case BackupAssistanceType.fire:
        return 'Fire Responders';
      case BackupAssistanceType.policePublicSafety:
        return 'Police / Public Safety Personnel';
      case BackupAssistanceType.rescue:
        return 'Rescue Personnel';
      case BackupAssistanceType.barangay:
        return 'Barangay Emergency Responders';
      case BackupAssistanceType.general:
        return 'Additional General Responders';
      case BackupAssistanceType.equipmentVehicle:
        return 'Equipment or Vehicle Support';
    }
  }

  String get databaseValue {
    switch (this) {
      case BackupAssistanceType.policePublicSafety:
        return 'police_public_safety';
      case BackupAssistanceType.equipmentVehicle:
        return 'equipment_vehicle';
      default:
        return name;
    }
  }
}

class BackupOffer {
  const BackupOffer({
    required this.id,
    required this.responderId,
    required this.responderName,
    required this.responderAvailability,
    required this.status,
    required this.offeredAt,
    this.decidedAt,
    this.decisionNote,
  });

  final String id;
  final String responderId;
  final String responderName;
  final String responderAvailability;
  final BackupOfferStatus status;
  final DateTime offeredAt;
  final DateTime? decidedAt;
  final String? decisionNote;
}

class BackupRequest {
  const BackupRequest({
    required this.id,
    required this.incidentId,
    required this.status,
    required this.requestedAt,
    required this.requestedBy,
    required this.requestingTeam,
    required this.assistanceTypes,
    required this.respondersNeeded,
    required this.reason,
    required this.urgency,
    required this.offers,
    this.fulfilledAt,
    this.cancelledAt,
    this.cancellationReason,
  });

  final String id;
  final String incidentId;
  final BackupRequestStatus status;
  final DateTime requestedAt;
  final String requestedBy;
  final String requestingTeam;
  final List<BackupAssistanceType> assistanceTypes;
  final int respondersNeeded;
  final String reason;
  final IncidentAlertLevel urgency;
  final List<BackupOffer> offers;
  final DateTime? fulfilledAt;
  final DateTime? cancelledAt;
  final String? cancellationReason;

  List<BackupOffer> get confirmedResponders => offers
      .where((offer) => offer.status == BackupOfferStatus.approved)
      .toList();
}
