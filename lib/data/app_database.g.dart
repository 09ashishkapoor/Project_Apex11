// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $SadhanaSessionsTable extends SadhanaSessions
    with TableInfo<$SadhanaSessionsTable, SadhanaSession> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SadhanaSessionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _deityIdMeta =
      const VerificationMeta('deityId');
  @override
  late final GeneratedColumn<String> deityId = GeneratedColumn<String>(
      'deity_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _mantraIdMeta =
      const VerificationMeta('mantraId');
  @override
  late final GeneratedColumn<String> mantraId = GeneratedColumn<String>(
      'mantra_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _startedAtMeta =
      const VerificationMeta('startedAt');
  @override
  late final GeneratedColumn<DateTime> startedAt = GeneratedColumn<DateTime>(
      'started_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _endedAtMeta =
      const VerificationMeta('endedAt');
  @override
  late final GeneratedColumn<DateTime> endedAt = GeneratedColumn<DateTime>(
      'ended_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _targetCountMeta =
      const VerificationMeta('targetCount');
  @override
  late final GeneratedColumn<int> targetCount = GeneratedColumn<int>(
      'target_count', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _completedCountMeta =
      const VerificationMeta('completedCount');
  @override
  late final GeneratedColumn<int> completedCount = GeneratedColumn<int>(
      'completed_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _modeMeta = const VerificationMeta('mode');
  @override
  late final GeneratedColumn<String> mode = GeneratedColumn<String>(
      'mode', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _durationSecondsMeta =
      const VerificationMeta('durationSeconds');
  @override
  late final GeneratedColumn<int> durationSeconds = GeneratedColumn<int>(
      'duration_seconds', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        deityId,
        mantraId,
        startedAt,
        endedAt,
        targetCount,
        completedCount,
        mode,
        durationSeconds,
        status
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sadhana_sessions';
  @override
  VerificationContext validateIntegrity(Insertable<SadhanaSession> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('deity_id')) {
      context.handle(_deityIdMeta,
          deityId.isAcceptableOrUnknown(data['deity_id']!, _deityIdMeta));
    } else if (isInserting) {
      context.missing(_deityIdMeta);
    }
    if (data.containsKey('mantra_id')) {
      context.handle(_mantraIdMeta,
          mantraId.isAcceptableOrUnknown(data['mantra_id']!, _mantraIdMeta));
    } else if (isInserting) {
      context.missing(_mantraIdMeta);
    }
    if (data.containsKey('started_at')) {
      context.handle(_startedAtMeta,
          startedAt.isAcceptableOrUnknown(data['started_at']!, _startedAtMeta));
    } else if (isInserting) {
      context.missing(_startedAtMeta);
    }
    if (data.containsKey('ended_at')) {
      context.handle(_endedAtMeta,
          endedAt.isAcceptableOrUnknown(data['ended_at']!, _endedAtMeta));
    }
    if (data.containsKey('target_count')) {
      context.handle(
          _targetCountMeta,
          targetCount.isAcceptableOrUnknown(
              data['target_count']!, _targetCountMeta));
    } else if (isInserting) {
      context.missing(_targetCountMeta);
    }
    if (data.containsKey('completed_count')) {
      context.handle(
          _completedCountMeta,
          completedCount.isAcceptableOrUnknown(
              data['completed_count']!, _completedCountMeta));
    }
    if (data.containsKey('mode')) {
      context.handle(
          _modeMeta, mode.isAcceptableOrUnknown(data['mode']!, _modeMeta));
    } else if (isInserting) {
      context.missing(_modeMeta);
    }
    if (data.containsKey('duration_seconds')) {
      context.handle(
          _durationSecondsMeta,
          durationSeconds.isAcceptableOrUnknown(
              data['duration_seconds']!, _durationSecondsMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    } else if (isInserting) {
      context.missing(_statusMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  SadhanaSession map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SadhanaSession(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      deityId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}deity_id'])!,
      mantraId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}mantra_id'])!,
      startedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}started_at'])!,
      endedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}ended_at']),
      targetCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}target_count'])!,
      completedCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}completed_count'])!,
      mode: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}mode'])!,
      durationSeconds: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}duration_seconds'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
    );
  }

  @override
  $SadhanaSessionsTable createAlias(String alias) {
    return $SadhanaSessionsTable(attachedDatabase, alias);
  }
}

class SadhanaSession extends DataClass implements Insertable<SadhanaSession> {
  final int id;
  final String deityId;
  final String mantraId;
  final DateTime startedAt;
  final DateTime? endedAt;
  final int targetCount;
  final int completedCount;
  final String mode;
  final int durationSeconds;
  final String status;
  const SadhanaSession(
      {required this.id,
      required this.deityId,
      required this.mantraId,
      required this.startedAt,
      this.endedAt,
      required this.targetCount,
      required this.completedCount,
      required this.mode,
      required this.durationSeconds,
      required this.status});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['deity_id'] = Variable<String>(deityId);
    map['mantra_id'] = Variable<String>(mantraId);
    map['started_at'] = Variable<DateTime>(startedAt);
    if (!nullToAbsent || endedAt != null) {
      map['ended_at'] = Variable<DateTime>(endedAt);
    }
    map['target_count'] = Variable<int>(targetCount);
    map['completed_count'] = Variable<int>(completedCount);
    map['mode'] = Variable<String>(mode);
    map['duration_seconds'] = Variable<int>(durationSeconds);
    map['status'] = Variable<String>(status);
    return map;
  }

  SadhanaSessionsCompanion toCompanion(bool nullToAbsent) {
    return SadhanaSessionsCompanion(
      id: Value(id),
      deityId: Value(deityId),
      mantraId: Value(mantraId),
      startedAt: Value(startedAt),
      endedAt: endedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(endedAt),
      targetCount: Value(targetCount),
      completedCount: Value(completedCount),
      mode: Value(mode),
      durationSeconds: Value(durationSeconds),
      status: Value(status),
    );
  }

  factory SadhanaSession.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SadhanaSession(
      id: serializer.fromJson<int>(json['id']),
      deityId: serializer.fromJson<String>(json['deityId']),
      mantraId: serializer.fromJson<String>(json['mantraId']),
      startedAt: serializer.fromJson<DateTime>(json['startedAt']),
      endedAt: serializer.fromJson<DateTime?>(json['endedAt']),
      targetCount: serializer.fromJson<int>(json['targetCount']),
      completedCount: serializer.fromJson<int>(json['completedCount']),
      mode: serializer.fromJson<String>(json['mode']),
      durationSeconds: serializer.fromJson<int>(json['durationSeconds']),
      status: serializer.fromJson<String>(json['status']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'deityId': serializer.toJson<String>(deityId),
      'mantraId': serializer.toJson<String>(mantraId),
      'startedAt': serializer.toJson<DateTime>(startedAt),
      'endedAt': serializer.toJson<DateTime?>(endedAt),
      'targetCount': serializer.toJson<int>(targetCount),
      'completedCount': serializer.toJson<int>(completedCount),
      'mode': serializer.toJson<String>(mode),
      'durationSeconds': serializer.toJson<int>(durationSeconds),
      'status': serializer.toJson<String>(status),
    };
  }

  SadhanaSession copyWith(
          {int? id,
          String? deityId,
          String? mantraId,
          DateTime? startedAt,
          Value<DateTime?> endedAt = const Value.absent(),
          int? targetCount,
          int? completedCount,
          String? mode,
          int? durationSeconds,
          String? status}) =>
      SadhanaSession(
        id: id ?? this.id,
        deityId: deityId ?? this.deityId,
        mantraId: mantraId ?? this.mantraId,
        startedAt: startedAt ?? this.startedAt,
        endedAt: endedAt.present ? endedAt.value : this.endedAt,
        targetCount: targetCount ?? this.targetCount,
        completedCount: completedCount ?? this.completedCount,
        mode: mode ?? this.mode,
        durationSeconds: durationSeconds ?? this.durationSeconds,
        status: status ?? this.status,
      );
  SadhanaSession copyWithCompanion(SadhanaSessionsCompanion data) {
    return SadhanaSession(
      id: data.id.present ? data.id.value : this.id,
      deityId: data.deityId.present ? data.deityId.value : this.deityId,
      mantraId: data.mantraId.present ? data.mantraId.value : this.mantraId,
      startedAt: data.startedAt.present ? data.startedAt.value : this.startedAt,
      endedAt: data.endedAt.present ? data.endedAt.value : this.endedAt,
      targetCount:
          data.targetCount.present ? data.targetCount.value : this.targetCount,
      completedCount: data.completedCount.present
          ? data.completedCount.value
          : this.completedCount,
      mode: data.mode.present ? data.mode.value : this.mode,
      durationSeconds: data.durationSeconds.present
          ? data.durationSeconds.value
          : this.durationSeconds,
      status: data.status.present ? data.status.value : this.status,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SadhanaSession(')
          ..write('id: $id, ')
          ..write('deityId: $deityId, ')
          ..write('mantraId: $mantraId, ')
          ..write('startedAt: $startedAt, ')
          ..write('endedAt: $endedAt, ')
          ..write('targetCount: $targetCount, ')
          ..write('completedCount: $completedCount, ')
          ..write('mode: $mode, ')
          ..write('durationSeconds: $durationSeconds, ')
          ..write('status: $status')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, deityId, mantraId, startedAt, endedAt,
      targetCount, completedCount, mode, durationSeconds, status);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SadhanaSession &&
          other.id == this.id &&
          other.deityId == this.deityId &&
          other.mantraId == this.mantraId &&
          other.startedAt == this.startedAt &&
          other.endedAt == this.endedAt &&
          other.targetCount == this.targetCount &&
          other.completedCount == this.completedCount &&
          other.mode == this.mode &&
          other.durationSeconds == this.durationSeconds &&
          other.status == this.status);
}

class SadhanaSessionsCompanion extends UpdateCompanion<SadhanaSession> {
  final Value<int> id;
  final Value<String> deityId;
  final Value<String> mantraId;
  final Value<DateTime> startedAt;
  final Value<DateTime?> endedAt;
  final Value<int> targetCount;
  final Value<int> completedCount;
  final Value<String> mode;
  final Value<int> durationSeconds;
  final Value<String> status;
  const SadhanaSessionsCompanion({
    this.id = const Value.absent(),
    this.deityId = const Value.absent(),
    this.mantraId = const Value.absent(),
    this.startedAt = const Value.absent(),
    this.endedAt = const Value.absent(),
    this.targetCount = const Value.absent(),
    this.completedCount = const Value.absent(),
    this.mode = const Value.absent(),
    this.durationSeconds = const Value.absent(),
    this.status = const Value.absent(),
  });
  SadhanaSessionsCompanion.insert({
    this.id = const Value.absent(),
    required String deityId,
    required String mantraId,
    required DateTime startedAt,
    this.endedAt = const Value.absent(),
    required int targetCount,
    this.completedCount = const Value.absent(),
    required String mode,
    this.durationSeconds = const Value.absent(),
    required String status,
  })  : deityId = Value(deityId),
        mantraId = Value(mantraId),
        startedAt = Value(startedAt),
        targetCount = Value(targetCount),
        mode = Value(mode),
        status = Value(status);
  static Insertable<SadhanaSession> custom({
    Expression<int>? id,
    Expression<String>? deityId,
    Expression<String>? mantraId,
    Expression<DateTime>? startedAt,
    Expression<DateTime>? endedAt,
    Expression<int>? targetCount,
    Expression<int>? completedCount,
    Expression<String>? mode,
    Expression<int>? durationSeconds,
    Expression<String>? status,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (deityId != null) 'deity_id': deityId,
      if (mantraId != null) 'mantra_id': mantraId,
      if (startedAt != null) 'started_at': startedAt,
      if (endedAt != null) 'ended_at': endedAt,
      if (targetCount != null) 'target_count': targetCount,
      if (completedCount != null) 'completed_count': completedCount,
      if (mode != null) 'mode': mode,
      if (durationSeconds != null) 'duration_seconds': durationSeconds,
      if (status != null) 'status': status,
    });
  }

  SadhanaSessionsCompanion copyWith(
      {Value<int>? id,
      Value<String>? deityId,
      Value<String>? mantraId,
      Value<DateTime>? startedAt,
      Value<DateTime?>? endedAt,
      Value<int>? targetCount,
      Value<int>? completedCount,
      Value<String>? mode,
      Value<int>? durationSeconds,
      Value<String>? status}) {
    return SadhanaSessionsCompanion(
      id: id ?? this.id,
      deityId: deityId ?? this.deityId,
      mantraId: mantraId ?? this.mantraId,
      startedAt: startedAt ?? this.startedAt,
      endedAt: endedAt ?? this.endedAt,
      targetCount: targetCount ?? this.targetCount,
      completedCount: completedCount ?? this.completedCount,
      mode: mode ?? this.mode,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      status: status ?? this.status,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (deityId.present) {
      map['deity_id'] = Variable<String>(deityId.value);
    }
    if (mantraId.present) {
      map['mantra_id'] = Variable<String>(mantraId.value);
    }
    if (startedAt.present) {
      map['started_at'] = Variable<DateTime>(startedAt.value);
    }
    if (endedAt.present) {
      map['ended_at'] = Variable<DateTime>(endedAt.value);
    }
    if (targetCount.present) {
      map['target_count'] = Variable<int>(targetCount.value);
    }
    if (completedCount.present) {
      map['completed_count'] = Variable<int>(completedCount.value);
    }
    if (mode.present) {
      map['mode'] = Variable<String>(mode.value);
    }
    if (durationSeconds.present) {
      map['duration_seconds'] = Variable<int>(durationSeconds.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SadhanaSessionsCompanion(')
          ..write('id: $id, ')
          ..write('deityId: $deityId, ')
          ..write('mantraId: $mantraId, ')
          ..write('startedAt: $startedAt, ')
          ..write('endedAt: $endedAt, ')
          ..write('targetCount: $targetCount, ')
          ..write('completedCount: $completedCount, ')
          ..write('mode: $mode, ')
          ..write('durationSeconds: $durationSeconds, ')
          ..write('status: $status')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $SadhanaSessionsTable sadhanaSessions =
      $SadhanaSessionsTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [sadhanaSessions];
}

typedef $$SadhanaSessionsTableCreateCompanionBuilder = SadhanaSessionsCompanion
    Function({
  Value<int> id,
  required String deityId,
  required String mantraId,
  required DateTime startedAt,
  Value<DateTime?> endedAt,
  required int targetCount,
  Value<int> completedCount,
  required String mode,
  Value<int> durationSeconds,
  required String status,
});
typedef $$SadhanaSessionsTableUpdateCompanionBuilder = SadhanaSessionsCompanion
    Function({
  Value<int> id,
  Value<String> deityId,
  Value<String> mantraId,
  Value<DateTime> startedAt,
  Value<DateTime?> endedAt,
  Value<int> targetCount,
  Value<int> completedCount,
  Value<String> mode,
  Value<int> durationSeconds,
  Value<String> status,
});

class $$SadhanaSessionsTableFilterComposer
    extends Composer<_$AppDatabase, $SadhanaSessionsTable> {
  $$SadhanaSessionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get deityId => $composableBuilder(
      column: $table.deityId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get mantraId => $composableBuilder(
      column: $table.mantraId, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get startedAt => $composableBuilder(
      column: $table.startedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get endedAt => $composableBuilder(
      column: $table.endedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get targetCount => $composableBuilder(
      column: $table.targetCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get completedCount => $composableBuilder(
      column: $table.completedCount,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get mode => $composableBuilder(
      column: $table.mode, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get durationSeconds => $composableBuilder(
      column: $table.durationSeconds,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));
}

class $$SadhanaSessionsTableOrderingComposer
    extends Composer<_$AppDatabase, $SadhanaSessionsTable> {
  $$SadhanaSessionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get deityId => $composableBuilder(
      column: $table.deityId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get mantraId => $composableBuilder(
      column: $table.mantraId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get startedAt => $composableBuilder(
      column: $table.startedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get endedAt => $composableBuilder(
      column: $table.endedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get targetCount => $composableBuilder(
      column: $table.targetCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get completedCount => $composableBuilder(
      column: $table.completedCount,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get mode => $composableBuilder(
      column: $table.mode, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get durationSeconds => $composableBuilder(
      column: $table.durationSeconds,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));
}

class $$SadhanaSessionsTableAnnotationComposer
    extends Composer<_$AppDatabase, $SadhanaSessionsTable> {
  $$SadhanaSessionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get deityId =>
      $composableBuilder(column: $table.deityId, builder: (column) => column);

  GeneratedColumn<String> get mantraId =>
      $composableBuilder(column: $table.mantraId, builder: (column) => column);

  GeneratedColumn<DateTime> get startedAt =>
      $composableBuilder(column: $table.startedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get endedAt =>
      $composableBuilder(column: $table.endedAt, builder: (column) => column);

  GeneratedColumn<int> get targetCount => $composableBuilder(
      column: $table.targetCount, builder: (column) => column);

  GeneratedColumn<int> get completedCount => $composableBuilder(
      column: $table.completedCount, builder: (column) => column);

  GeneratedColumn<String> get mode =>
      $composableBuilder(column: $table.mode, builder: (column) => column);

  GeneratedColumn<int> get durationSeconds => $composableBuilder(
      column: $table.durationSeconds, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);
}

class $$SadhanaSessionsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $SadhanaSessionsTable,
    SadhanaSession,
    $$SadhanaSessionsTableFilterComposer,
    $$SadhanaSessionsTableOrderingComposer,
    $$SadhanaSessionsTableAnnotationComposer,
    $$SadhanaSessionsTableCreateCompanionBuilder,
    $$SadhanaSessionsTableUpdateCompanionBuilder,
    (
      SadhanaSession,
      BaseReferences<_$AppDatabase, $SadhanaSessionsTable, SadhanaSession>
    ),
    SadhanaSession,
    PrefetchHooks Function()> {
  $$SadhanaSessionsTableTableManager(
      _$AppDatabase db, $SadhanaSessionsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SadhanaSessionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SadhanaSessionsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SadhanaSessionsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> deityId = const Value.absent(),
            Value<String> mantraId = const Value.absent(),
            Value<DateTime> startedAt = const Value.absent(),
            Value<DateTime?> endedAt = const Value.absent(),
            Value<int> targetCount = const Value.absent(),
            Value<int> completedCount = const Value.absent(),
            Value<String> mode = const Value.absent(),
            Value<int> durationSeconds = const Value.absent(),
            Value<String> status = const Value.absent(),
          }) =>
              SadhanaSessionsCompanion(
            id: id,
            deityId: deityId,
            mantraId: mantraId,
            startedAt: startedAt,
            endedAt: endedAt,
            targetCount: targetCount,
            completedCount: completedCount,
            mode: mode,
            durationSeconds: durationSeconds,
            status: status,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String deityId,
            required String mantraId,
            required DateTime startedAt,
            Value<DateTime?> endedAt = const Value.absent(),
            required int targetCount,
            Value<int> completedCount = const Value.absent(),
            required String mode,
            Value<int> durationSeconds = const Value.absent(),
            required String status,
          }) =>
              SadhanaSessionsCompanion.insert(
            id: id,
            deityId: deityId,
            mantraId: mantraId,
            startedAt: startedAt,
            endedAt: endedAt,
            targetCount: targetCount,
            completedCount: completedCount,
            mode: mode,
            durationSeconds: durationSeconds,
            status: status,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$SadhanaSessionsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $SadhanaSessionsTable,
    SadhanaSession,
    $$SadhanaSessionsTableFilterComposer,
    $$SadhanaSessionsTableOrderingComposer,
    $$SadhanaSessionsTableAnnotationComposer,
    $$SadhanaSessionsTableCreateCompanionBuilder,
    $$SadhanaSessionsTableUpdateCompanionBuilder,
    (
      SadhanaSession,
      BaseReferences<_$AppDatabase, $SadhanaSessionsTable, SadhanaSession>
    ),
    SadhanaSession,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$SadhanaSessionsTableTableManager get sadhanaSessions =>
      $$SadhanaSessionsTableTableManager(_db, _db.sadhanaSessions);
}
