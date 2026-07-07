class DeviceLocation {
  const DeviceLocation({
    required this.name,
    required this.deviceId,
    required this.approximateAddress,
    required this.coordinates,
    required this.zone,
  });

  final String name;
  final String deviceId;
  final String approximateAddress;
  final String coordinates;
  final String zone;
}
