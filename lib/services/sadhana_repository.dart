import 'dart:convert';

import 'package:drift/drift.dart';

import '../data/app_database.dart';
import '../data/deities.dart';
import '../models/deity.dart';
import '../models/sadhana_session.dart';
import '../models/sadhana_stats.dart';

enum BackupImportMode { merge, replace }

class ImportBackupResult {
  const ImportBackupResult({required this.importedCount, required this.mode});

  final int importedCount;
  final BackupImportMode mode;
}

class SadhanaRepository {
  SadhanaRepository(this.database);

  final AppDatabase database;

  List<Deity> get deities => kDeities;

  Future<int> startSession({
    required Deity deity,
    required SadhanaSessionMode mode,
    required int targetCount,
    required int durationSeconds,
  }) {
    final now = DateTime.now();
    return database.into(database.sadhanaSessions).insert(
          SadhanaSessionsCompanion.insert(
            deityId: deity.id,
            mantraId: deity.mantraId,
            startedAt: now,
            targetCount: targetCount,
            mode: mode.storageValue,
            durationSeconds: Value(durationSeconds),
            status: SadhanaSessionStatus.active.storageValue,
          ),
        );
  }

  Future<void> pauseSession({
    required int sessionId,
    required int completedCount,
    required int durationSeconds,
  }) {
    return _updateSession(
      sessionId: sessionId,
      completedCount: completedCount,
      durationSeconds: durationSeconds,
      status: SadhanaSessionStatus.paused,
    );
  }

  Future<void> resumeSession({
    required int sessionId,
    required int completedCount,
    required int durationSeconds,
  }) {
    return _updateSession(
      sessionId: sessionId,
      completedCount: completedCount,
      durationSeconds: durationSeconds,
      status: SadhanaSessionStatus.active,
    );
  }

  Future<void> updateProgress({
    required int sessionId,
    required int completedCount,
    required int durationSeconds,
  }) {
    return _updateSession(
      sessionId: sessionId,
      completedCount: completedCount,
      durationSeconds: durationSeconds,
      status: SadhanaSessionStatus.active,
    );
  }

  Future<void> completeSession({
    required int sessionId,
    required int completedCount,
    required int durationSeconds,
  }) {
    return _updateSession(
      sessionId: sessionId,
      completedCount: completedCount,
      durationSeconds: durationSeconds,
      status: SadhanaSessionStatus.completed,
      endedAt: DateTime.now(),
    );
  }

  Future<void> cancelSession({
    required int sessionId,
    required int completedCount,
    required int durationSeconds,
  }) {
    return _updateSession(
      sessionId: sessionId,
      completedCount: completedCount,
      durationSeconds: durationSeconds,
      status: SadhanaSessionStatus.cancelled,
      endedAt: DateTime.now(),
    );
  }

  Future<void> _updateSession({
    required int sessionId,
    required int completedCount,
    required int durationSeconds,
    required SadhanaSessionStatus status,
    DateTime? endedAt,
  }) {
    return (database.update(database.sadhanaSessions)
          ..where((tbl) => tbl.id.equals(sessionId)))
        .write(
      SadhanaSessionsCompanion(
        completedCount: Value(completedCount),
        durationSeconds: Value(durationSeconds),
        status: Value(status.storageValue),
        endedAt: endedAt == null ? const Value.absent() : Value(endedAt),
      ),
    );
  }

  Stream<SadhanaStats> watchStats() {
    final query = database.select(database.sadhanaSessions)
      ..orderBy([(tbl) => OrderingTerm.desc(tbl.startedAt)]);
    return query.watch().map(_buildStats);
  }

  Future<SadhanaStats> loadStats() async {
    final query = database.select(database.sadhanaSessions)
      ..orderBy([(tbl) => OrderingTerm.desc(tbl.startedAt)]);
    return _buildStats(await query.get());
  }

  Future<void> resetAllSessions() {
    return database.delete(database.sadhanaSessions).go();
  }

  Future<void> resetDeitySessions(String deityId) {
    return (database.delete(database.sadhanaSessions)
          ..where((tbl) => tbl.deityId.equals(deityId)))
        .go();
  }

  Future<String> exportSessionsJson() async {
    final rows = await (database.select(database.sadhanaSessions)
          ..orderBy([(tbl) => OrderingTerm.asc(tbl.startedAt)]))
        .get();

    final payload = {
      'format': 'sadhana_for_a_khyapa_backup',
      'version': 1,
      'exportedAt': DateTime.now().toIso8601String(),
      'sessions': rows.map(_rowToJson).toList(),
    };

    return const JsonEncoder.withIndent('  ').convert(payload);
  }

  Future<ImportBackupResult> importSessionsJson(
    String rawJson, {
    required BackupImportMode mode,
  }) async {
    final decoded = jsonDecode(rawJson);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Backup must decode to a JSON object.');
    }

    final sessions = decoded['sessions'];
    if (sessions is! List) {
      throw const FormatException('Backup is missing a sessions list.');
    }

    final companions = sessions.map(_jsonToCompanion).toList(growable: false);

    await database.transaction(() async {
      if (mode == BackupImportMode.replace) {
        await database.delete(database.sadhanaSessions).go();
      }

      await database.batch((batch) {
        for (final companion in companions) {
          batch.insert(
            database.sadhanaSessions,
            companion,
            mode: InsertMode.insertOrIgnore,
          );
        }
      });
    });

    return ImportBackupResult(importedCount: companions.length, mode: mode);
  }

  SadhanaStats _buildStats(List<SadhanaSession> rows) {
    final completedRows = rows
        .where(
            (row) => row.status == SadhanaSessionStatus.completed.storageValue)
        .toList(growable: false);
    final today = DateTime.now();
    var todayTotal = 0;
    var lifetimeTotal = 0;
    final perDeity = <String, int>{for (final deity in kDeities) deity.id: 0};

    for (final row in completedRows) {
      lifetimeTotal += row.completedCount;
      perDeity[row.deityId] = (perDeity[row.deityId] ?? 0) + row.completedCount;
      final anchor = row.endedAt ?? row.startedAt;
      if (_isSameDay(anchor, today)) {
        todayTotal += row.completedCount;
      }
    }

    final deityStats = kDeities
        .map(
          (deity) => DeitySadhanaStats(
            deity: deity,
            totalCount: perDeity[deity.id] ?? 0,
            completedMalas: ((perDeity[deity.id] ?? 0) / 108).floor(),
          ),
        )
        .toList(growable: false);

    final recentSessions = completedRows
        .map(
          (row) => RecentSadhanaSession(
            id: row.id,
            deity: kDeitiesById[row.deityId] ?? kDeities.last,
            mode: SadhanaSessionMode.fromStorage(row.mode),
            status: SadhanaSessionStatus.fromStorage(row.status),
            completedCount: row.completedCount,
            targetCount: row.targetCount,
            durationSeconds: row.durationSeconds,
            startedAt: row.startedAt,
            endedAt: row.endedAt,
          ),
        )
        .take(12)
        .toList(growable: false);

    return SadhanaStats(
      todayTotal: todayTotal,
      lifetimeTotal: lifetimeTotal,
      completedMalas: (lifetimeTotal / 108).floor(),
      perDeity: deityStats,
      recentSessions: recentSessions,
    );
  }

  Map<String, Object?> _rowToJson(SadhanaSession row) {
    return {
      'id': row.id,
      'deityId': row.deityId,
      'mantraId': row.mantraId,
      'startedAt': row.startedAt.toIso8601String(),
      'endedAt': row.endedAt?.toIso8601String(),
      'targetCount': row.targetCount,
      'completedCount': row.completedCount,
      'mode': row.mode,
      'durationSeconds': row.durationSeconds,
      'status': row.status,
    };
  }

  SadhanaSessionsCompanion _jsonToCompanion(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Each session must be a JSON object.');
    }

    final deityId = json['deityId'];
    if (deityId is! String || !kDeitiesById.containsKey(deityId)) {
      throw FormatException('Unknown deityId in backup: $deityId');
    }

    final mode = json['mode'];
    final status = json['status'];
    if (mode is! String || status is! String) {
      throw const FormatException(
          'Backup sessions must include mode and status.');
    }

    final hasValidMode = SadhanaSessionMode.values
        .any((candidate) => candidate.storageValue == mode);
    final hasValidStatus = SadhanaSessionStatus.values.any(
      (candidate) => candidate.storageValue == status,
    );
    if (!hasValidMode || !hasValidStatus) {
      throw const FormatException('Backup contains an unknown mode or status.');
    }

    final backupId = (json['id'] as num?)?.toInt();

    return SadhanaSessionsCompanion.insert(
      id: backupId == null ? const Value.absent() : Value(backupId),
      deityId: deityId,
      mantraId: json['mantraId'] as String? ?? kDeitiesById[deityId]!.mantraId,
      startedAt: DateTime.parse(json['startedAt'] as String),
      endedAt: (json['endedAt'] as String?) == null
          ? const Value.absent()
          : Value(DateTime.parse(json['endedAt'] as String)),
      targetCount: (json['targetCount'] as num?)?.toInt() ?? 0,
      completedCount: Value((json['completedCount'] as num?)?.toInt() ?? 0),
      mode: mode,
      durationSeconds: Value((json['durationSeconds'] as num?)?.toInt() ?? 0),
      status: status,
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}
