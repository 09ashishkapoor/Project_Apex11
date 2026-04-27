import 'deity.dart';
import 'sadhana_session.dart';

class DeitySadhanaStats {
  const DeitySadhanaStats({
    required this.deity,
    required this.totalCount,
    required this.completedMalas,
  });

  final Deity deity;
  final int totalCount;
  final int completedMalas;
}

class RecentSadhanaSession {
  const RecentSadhanaSession({
    required this.id,
    required this.deity,
    required this.mode,
    required this.status,
    required this.completedCount,
    required this.targetCount,
    required this.durationSeconds,
    required this.startedAt,
    required this.endedAt,
  });

  final int id;
  final Deity deity;
  final SadhanaSessionMode mode;
  final SadhanaSessionStatus status;
  final int completedCount;
  final int targetCount;
  final int durationSeconds;
  final DateTime startedAt;
  final DateTime? endedAt;
}

class SadhanaStats {
  const SadhanaStats({
    required this.todayTotal,
    required this.lifetimeTotal,
    required this.completedMalas,
    required this.perDeity,
    required this.recentSessions,
  });

  final int todayTotal;
  final int lifetimeTotal;
  final int completedMalas;
  final List<DeitySadhanaStats> perDeity;
  final List<RecentSadhanaSession> recentSessions;
}
