enum SadhanaSessionMode {
  manual,
  audio,
  timed;

  String get storageValue => name;

  String get label => switch (this) {
        SadhanaSessionMode.manual => 'Manual',
        SadhanaSessionMode.audio => 'Audio-guided',
        SadhanaSessionMode.timed => 'Timed auto',
      };

  static SadhanaSessionMode fromStorage(String value) {
    return SadhanaSessionMode.values.firstWhere(
      (mode) => mode.storageValue == value,
      orElse: () => SadhanaSessionMode.manual,
    );
  }
}

enum SadhanaSessionStatus {
  active,
  paused,
  completed,
  cancelled;

  String get storageValue => name;

  static SadhanaSessionStatus fromStorage(String value) {
    return SadhanaSessionStatus.values.firstWhere(
      (status) => status.storageValue == value,
      orElse: () => SadhanaSessionStatus.completed,
    );
  }
}

class SadhanaSessionRecord {
  const SadhanaSessionRecord({
    required this.id,
    required this.deityId,
    required this.mantraId,
    required this.startedAt,
    required this.endedAt,
    required this.targetCount,
    required this.completedCount,
    required this.mode,
    required this.durationSeconds,
    required this.status,
  });

  final int id;
  final String deityId;
  final String mantraId;
  final DateTime startedAt;
  final DateTime? endedAt;
  final int targetCount;
  final int completedCount;
  final SadhanaSessionMode mode;
  final int durationSeconds;
  final SadhanaSessionStatus status;

  bool get isFinished =>
      status == SadhanaSessionStatus.completed ||
      status == SadhanaSessionStatus.cancelled;
}
