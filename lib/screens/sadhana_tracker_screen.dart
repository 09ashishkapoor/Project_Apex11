import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/deity.dart';
import '../models/sadhana_stats.dart';
import '../services/sadhana_repository.dart';
import '../theme/app_theme.dart';

class SadhanaTrackerScreen extends StatefulWidget {
  const SadhanaTrackerScreen({
    super.key,
    required this.repository,
  });

  final SadhanaRepository repository;

  @override
  State<SadhanaTrackerScreen> createState() => _SadhanaTrackerScreenState();
}

class _SadhanaTrackerScreenState extends State<SadhanaTrackerScreen> {
  SadhanaRepository get _repository => widget.repository;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sadhana Tracker'),
        actions: [
          IconButton(
            onPressed: _showExportDialog,
            icon: const Icon(Icons.download_rounded),
            tooltip: 'Export backup JSON',
          ),
          IconButton(
            onPressed: _showImportDialog,
            icon: const Icon(Icons.upload_rounded),
            tooltip: 'Import backup JSON',
          ),
          IconButton(
            onPressed: _confirmResetAll,
            icon: const Icon(Icons.delete_sweep_rounded),
            tooltip: 'Reset all tracked sessions',
          ),
        ],
      ),
      body: StreamBuilder<SadhanaStats>(
        stream: _repository.watchStats(),
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Unable to load tracker data. ${snapshot.error}',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
            );
          }

          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final stats = snapshot.data!;
          final bottomInset = MediaQuery.of(context).padding.bottom;
          return ListView(
            padding: EdgeInsets.fromLTRB(16, 16, 16, bottomInset + 24),
            children: [
              Text(
                'Your Spiritual Journey',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                'Live totals are computed from completed sessions.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              _buildOverviewCard(stats),
              const SizedBox(height: 16),
              Text(
                'Per-deity totals',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              ...stats.perDeity.map(_buildDeityCard),
              const SizedBox(height: 8),
              Text(
                'Recent completed sessions',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              _buildRecentSessionsCard(stats.recentSessions),
            ],
          );
        },
      ),
    );
  }

  Widget _buildOverviewCard(SadhanaStats stats) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Aggregates', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                    child: _buildMetric('Today', stats.todayTotal.toString())),
                const SizedBox(width: 12),
                Expanded(
                  child:
                      _buildMetric('Lifetime', stats.lifetimeTotal.toString()),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildMetric(
                      'Malas of 108', stats.completedMalas.toString()),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetric(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.templeShadow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.antiqueGold.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 4),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }

  Widget _buildDeityCard(DeitySadhanaStats deityStats) {
    final deity = deityStats.deity;
    final cycleCount = deityStats.totalCount % deity.defaultTargetCount;
    final progress = deity.defaultTargetCount == 0
        ? 0.0
        : cycleCount / deity.defaultTargetCount;
    final remaining = deity.defaultTargetCount - cycleCount;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.asset(
                    deity.imageAsset,
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        deity.displayName,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${deityStats.totalCount} chants · ${deityStats.completedMalas} malas',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => _confirmResetDeity(deity),
                  icon: const Icon(Icons.refresh_rounded),
                  tooltip: 'Reset only ${deity.displayName} session history',
                ),
              ],
            ),
            const SizedBox(height: 10),
            LinearProgressIndicator(
              value: progress,
              minHeight: 10,
              borderRadius: BorderRadius.circular(100),
            ),
            const SizedBox(height: 8),
            Text(
              cycleCount == 0
                  ? 'Next mala starts at ${deity.defaultTargetCount} chants.'
                  : '$remaining chants remaining for the next mala.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentSessionsCard(List<RecentSadhanaSession> recentSessions) {
    if (recentSessions.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'No completed sessions yet. Finish a session to build your history.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      );
    }

    return Card(
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: recentSessions.length,
        separatorBuilder: (_, __) =>
            Divider(color: AppTheme.antiqueGold.withValues(alpha: 0.14)),
        itemBuilder: (context, index) {
          final session = recentSessions[index];
          return ListTile(
            leading: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Image.asset(
                session.deity.imageAsset,
                width: 36,
                height: 36,
                fit: BoxFit.cover,
              ),
            ),
            title: Text(
                '${session.deity.displayName} · ${session.completedCount} chants'),
            subtitle: Text(
              '${session.mode.label} · ${_formatDuration(session.durationSeconds)} · ${_formatDateTime(session.endedAt ?? session.startedAt)}',
            ),
            trailing: Text('${(session.completedCount / 108).floor()} malas'),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
          );
        },
      ),
    );
  }

  Future<void> _confirmResetAll() async {
    final shouldReset = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Reset all session history?'),
          content: const Text(
            'This deletes every tracked session for every deity. Totals and recent history will be fully cleared.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Delete all'),
            ),
          ],
        );
      },
    );

    if (shouldReset != true) return;

    await _repository.resetAllSessions();
    if (!mounted) return;
    _showMessage('All session history deleted.');
  }

  Future<void> _confirmResetDeity(Deity deity) async {
    final shouldReset = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: Text('Reset ${deity.displayName}?'),
          content: Text(
            'This deletes all tracked sessions for ${deity.displayName} only. Other deity histories remain untouched.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: const Text('Delete deity history'),
            ),
          ],
        );
      },
    );

    if (shouldReset != true) return;

    await _repository.resetDeitySessions(deity.id);
    if (!mounted) return;
    _showMessage('${deity.displayName} session history deleted.');
  }

  Future<void> _showExportDialog() async {
    try {
      final payload = await _repository.exportSessionsJson();
      if (!mounted) return;

      final controller = TextEditingController(text: payload);
      await showDialog<void>(
        context: context,
        builder: (dialogContext) {
          return AlertDialog(
            title: const Text('Export backup JSON'),
            content: SizedBox(
              width: double.maxFinite,
              child: TextField(
                controller: controller,
                readOnly: true,
                maxLines: 14,
                minLines: 8,
                decoration: const InputDecoration(
                  labelText: 'Backup payload',
                  alignLabelWithHint: true,
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: controller.text));
                  if (!mounted) return;
                  _showMessage('Backup copied to clipboard.');
                },
                child: const Text('Copy'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(dialogContext),
                child: const Text('Close'),
              ),
            ],
          );
        },
      );
      controller.dispose();
    } on Object catch (error) {
      if (!mounted) return;
      _showMessage('Export failed: $error', isError: true);
    }
  }

  Future<void> _showImportDialog() async {
    final controller = TextEditingController();

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Import backup JSON'),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: controller,
                  maxLines: 12,
                  minLines: 8,
                  decoration: const InputDecoration(
                    labelText: 'Paste backup payload',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    onPressed: () async {
                      final clipboard =
                          await Clipboard.getData(Clipboard.kTextPlain);
                      controller.text = clipboard?.text?.trim() ?? '';
                    },
                    icon: const Icon(Icons.content_paste_rounded),
                    label: const Text('Paste from clipboard'),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () async {
                final navigator = Navigator.of(dialogContext);
                final raw = controller.text.trim();
                if (raw.isEmpty) {
                  _showMessage('Paste backup JSON before importing.',
                      isError: true);
                  return;
                }

                await _importBackup(raw, BackupImportMode.merge);
                if (!mounted) return;
                navigator.pop();
              },
              child: const Text('Import merge'),
            ),
            TextButton(
              onPressed: () async {
                final navigator = Navigator.of(dialogContext);
                final raw = controller.text.trim();
                if (raw.isEmpty) {
                  _showMessage('Paste backup JSON before importing.',
                      isError: true);
                  return;
                }

                final shouldReplace = await showDialog<bool>(
                  context: context,
                  builder: (replaceContext) {
                    return AlertDialog(
                      title: const Text('Replace all existing sessions?'),
                      content: const Text(
                        'Replace import deletes current session history first, then imports the backup payload.',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(replaceContext, false),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(replaceContext, true),
                          child: const Text('Replace now'),
                        ),
                      ],
                    );
                  },
                );

                if (shouldReplace != true) return;

                await _importBackup(raw, BackupImportMode.replace);
                if (!mounted) return;
                navigator.pop();
              },
              child: const Text('Import replace'),
            ),
          ],
        );
      },
    );

    controller.dispose();
  }

  Future<void> _importBackup(String rawJson, BackupImportMode mode) async {
    try {
      final result = await _repository.importSessionsJson(rawJson, mode: mode);
      if (!mounted) return;
      final modeLabel =
          result.mode == BackupImportMode.merge ? 'merge' : 'replace';
      _showMessage('Imported ${result.importedCount} sessions via $modeLabel.');
    } on FormatException catch (error) {
      if (!mounted) return;
      _showMessage('Import failed: ${error.message}', isError: true);
    } on Object catch (error) {
      if (!mounted) return;
      _showMessage('Import failed: $error', isError: true);
    }
  }

  void _showMessage(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade700 : null,
      ),
    );
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final remSeconds = seconds % 60;
    return '${minutes}m ${remSeconds.toString().padLeft(2, '0')}s';
  }

  String _formatDateTime(DateTime value) {
    final month = value.month.toString().padLeft(2, '0');
    final day = value.day.toString().padLeft(2, '0');
    final hour = value.hour.toString().padLeft(2, '0');
    final minute = value.minute.toString().padLeft(2, '0');
    return '${value.year}-$month-$day $hour:$minute';
  }
}
