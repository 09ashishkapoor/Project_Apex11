import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sadhana_for_a_khyapa/data/app_database.dart';
import 'package:sadhana_for_a_khyapa/services/sadhana_repository.dart';
import 'package:sadhana_for_a_khyapa/models/sadhana_session.dart';

void main() {
  late AppDatabase database;
  late SadhanaRepository repository;

  setUp(() {
    database = AppDatabase(
      DatabaseConnection(
        NativeDatabase.memory(),
        closeStreamsSynchronously: true,
      ),
    );
    repository = SadhanaRepository(database);
  });

  tearDown(() async {
    await database.close();
  });

  test('aggregates completed sessions only', () async {
    final batuk = repository.deities.first;
    final skanda = repository.deities[2];

    final completedId = await repository.startSession(
      deity: batuk,
      mode: SadhanaSessionMode.manual,
      targetCount: 108,
      durationSeconds: 0,
    );
    await repository.completeSession(
      sessionId: completedId,
      completedCount: 108,
      durationSeconds: 600,
    );

    final secondCompletedId = await repository.startSession(
      deity: skanda,
      mode: SadhanaSessionMode.audio,
      targetCount: 27,
      durationSeconds: 0,
    );
    await repository.completeSession(
      sessionId: secondCompletedId,
      completedCount: 27,
      durationSeconds: 180,
    );

    final cancelledId = await repository.startSession(
      deity: batuk,
      mode: SadhanaSessionMode.manual,
      targetCount: 54,
      durationSeconds: 0,
    );
    await repository.cancelSession(
      sessionId: cancelledId,
      completedCount: 40,
      durationSeconds: 120,
    );

    final stats = await repository.loadStats();

    expect(stats.todayTotal, 135);
    expect(stats.lifetimeTotal, 135);
    expect(stats.completedMalas, 1);
    expect(
      stats.perDeity.firstWhere((item) => item.deity.id == batuk.id).totalCount,
      108,
    );
    expect(
      stats.perDeity
          .firstWhere((item) => item.deity.id == skanda.id)
          .totalCount,
      27,
    );
    expect(stats.recentSessions, hasLength(2));
  });

  test('exports and reimports backup payload', () async {
    final deity = repository.deities.first;
    final sessionId = await repository.startSession(
      deity: deity,
      mode: SadhanaSessionMode.timed,
      targetCount: 0,
      durationSeconds: 300,
    );
    await repository.completeSession(
      sessionId: sessionId,
      completedCount: 21,
      durationSeconds: 300,
    );

    final backup = await repository.exportSessionsJson();
    final decoded = jsonDecode(backup) as Map<String, dynamic>;
    expect(decoded['format'], 'sadhana_for_a_khyapa_backup');
    expect((decoded['sessions'] as List), hasLength(1));

    await repository.resetAllSessions();
    final result = await repository.importSessionsJson(
      backup,
      mode: BackupImportMode.replace,
    );

    expect(result.importedCount, 1);
    final stats = await repository.loadStats();
    expect(stats.lifetimeTotal, 21);
    expect(stats.recentSessions.single.mode, SadhanaSessionMode.timed);
  });
}
