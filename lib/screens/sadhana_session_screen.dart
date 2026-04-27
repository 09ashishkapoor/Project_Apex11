import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../models/deity.dart';
import '../models/sadhana_session.dart';
import '../services/sadhana_repository.dart';

class SadhanaSessionScreen extends StatefulWidget {
  const SadhanaSessionScreen({
    super.key,
    required this.deity,
    required this.repository,
  });

  final Deity deity;
  final SadhanaRepository repository;

  @override
  State<SadhanaSessionScreen> createState() => _SadhanaSessionScreenState();
}

class _SadhanaSessionScreenState extends State<SadhanaSessionScreen> {
  static const int _defaultTimedMinutes = 5;

  late final AudioPlayer _audioPlayer;
  late final TextEditingController _targetController;
  late final TextEditingController _durationController;

  StreamSubscription<PlayerState>? _playerStateSubscription;
  StreamSubscription<void>? _playerCompleteSubscription;
  Timer? _countdownTimer;
  Stopwatch _sessionStopwatch = Stopwatch();

  SadhanaSessionMode _mode = SadhanaSessionMode.manual;
  SadhanaSessionStatus? _status;
  int? _sessionId;

  late int _targetCount;
  int _completedCount = 0;
  Duration _timedDuration = const Duration(minutes: _defaultTimedMinutes);
  Duration _remainingDuration = const Duration(minutes: _defaultTimedMinutes);

  bool _isPlaying = false;
  bool _showMantra = false;
  DateTime? _currentTimedChantStartedAt;

  bool get _isActive => _status == SadhanaSessionStatus.active;
  bool get _isPaused => _status == SadhanaSessionStatus.paused;
  bool get _isTimed => _mode == SadhanaSessionMode.timed;

  Duration get _elapsed =>
      Duration(seconds: _sessionStopwatch.elapsed.inSeconds);

  Deity get _deity => widget.deity;
  SadhanaRepository get _repository => widget.repository;

  @override
  void initState() {
    super.initState();
    _targetCount = _deity.defaultTargetCount;
    _targetController = TextEditingController(text: _targetCount.toString());
    _durationController = TextEditingController(text: '$_defaultTimedMinutes');
    _timedDuration = const Duration(minutes: _defaultTimedMinutes);
    _remainingDuration = _timedDuration;

    _audioPlayer = AudioPlayer();
    _listenAudioPlayer();
  }

  void _listenAudioPlayer() {
    _playerStateSubscription =
        _audioPlayer.onPlayerStateChanged.listen((state) {
      if (!mounted) return;
      setState(() {
        _isPlaying = state == PlayerState.playing;
        _showMantra = _isPlaying || _isActive;
      });
    });

    _playerCompleteSubscription =
        _audioPlayer.onPlayerComplete.listen((_) async {
      if (!mounted) return;

      if (_mode == SadhanaSessionMode.timed) {
        final startedAt = _currentTimedChantStartedAt;
        final stillWithinWindow =
            startedAt != null && _remainingDuration.inSeconds > 0 && _isActive;
        if (!stillWithinWindow) {
          return;
        }
      }

      await _incrementProgress();

      if (_mode == SadhanaSessionMode.timed && _isActive) {
        await _startSingleChant();
      }
    });
  }

  String _audioRelativePath(String assetPath) {
    if (assetPath.startsWith('assets/')) {
      return assetPath.substring('assets/'.length);
    }
    return assetPath;
  }

  Future<void> _startSingleChant() async {
    if (!_isActive || _isPlaying) return;
    if (_mode == SadhanaSessionMode.timed &&
        _remainingDuration.inSeconds <= 0) {
      return;
    }

    try {
      _currentTimedChantStartedAt =
          _mode == SadhanaSessionMode.timed ? DateTime.now() : null;
      await _audioPlayer.stop();
      await _audioPlayer
          .play(AssetSource(_audioRelativePath(_deity.audioAsset)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text('Unable to play ${_deity.displayName} chant audio.')),
      );
    }
  }

  int _parsePositiveInt(
    TextEditingController controller,
    int fallback,
    String fieldName,
  ) {
    final parsed = int.tryParse(controller.text.trim());
    if (parsed == null || parsed <= 0) {
      controller.text = fallback.toString();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text(
                  '$fieldName must be a positive number. Using $fallback.')),
        );
      }
      return fallback;
    }
    return parsed;
  }

  Future<void> _startSession() async {
    if (_isActive || _isPaused) return;

    final target = _parsePositiveInt(
      _targetController,
      _deity.defaultTargetCount,
      'Target count',
    );
    final durationMinutes = _parsePositiveInt(
      _durationController,
      _defaultTimedMinutes,
      'Timed duration',
    );
    final duration = Duration(minutes: durationMinutes);

    _targetCount = target;
    _timedDuration = duration;
    _remainingDuration = duration;
    _completedCount = 0;
    _sessionStopwatch = Stopwatch()..start();

    final id = await _repository.startSession(
      deity: _deity,
      mode: _mode,
      targetCount: _targetCount,
      durationSeconds:
          _mode == SadhanaSessionMode.timed ? duration.inSeconds : 0,
    );

    setState(() {
      _sessionId = id;
      _status = SadhanaSessionStatus.active;
      _showMantra = _mode != SadhanaSessionMode.manual;
    });

    await WakelockPlus.enable();

    if (_mode == SadhanaSessionMode.timed) {
      _startCountdownTimer();
      await _startSingleChant();
    }
  }

  void _startCountdownTimer() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      if (!_isActive || !_isTimed) {
        timer.cancel();
        return;
      }

      if (_remainingDuration.inSeconds <= 1) {
        setState(() {
          _remainingDuration = Duration.zero;
        });
        timer.cancel();
        await _audioPlayer.stop();
        await _completeSession(dueToTimer: true);
        return;
      }

      setState(() {
        _remainingDuration -= const Duration(seconds: 1);
      });
    });
  }

  Future<void> _incrementProgress() async {
    if (!_isActive || _sessionId == null) return;

    final nextCount = _completedCount + 1;
    final durationSeconds = _elapsed.inSeconds;
    await _repository.updateProgress(
      sessionId: _sessionId!,
      completedCount: nextCount,
      durationSeconds: durationSeconds,
    );

    if (!mounted) return;
    setState(() {
      _completedCount = nextCount;
    });

    if ((_mode == SadhanaSessionMode.manual ||
            _mode == SadhanaSessionMode.audio) &&
        _completedCount >= _targetCount) {
      await _completeSession();
    }
  }

  Future<void> _manualTap() async {
    if (!_isActive || _mode != SadhanaSessionMode.manual) return;
    await _incrementProgress();
  }

  Future<void> _pauseSession() async {
    if (!_isActive || _sessionId == null) return;

    _countdownTimer?.cancel();
    _sessionStopwatch.stop();
    await _audioPlayer.stop();
    await _repository.pauseSession(
      sessionId: _sessionId!,
      completedCount: _completedCount,
      durationSeconds: _elapsed.inSeconds,
    );

    if (!mounted) return;
    setState(() {
      _status = SadhanaSessionStatus.paused;
      _isPlaying = false;
      _showMantra = false;
    });

    await WakelockPlus.disable();
  }

  Future<void> _resumeSession() async {
    if (!_isPaused || _sessionId == null) return;

    _sessionStopwatch.start();
    await _repository.resumeSession(
      sessionId: _sessionId!,
      completedCount: _completedCount,
      durationSeconds: _elapsed.inSeconds,
    );

    if (!mounted) return;
    setState(() {
      _status = SadhanaSessionStatus.active;
      _showMantra = _mode != SadhanaSessionMode.manual;
    });

    await WakelockPlus.enable();

    if (_mode == SadhanaSessionMode.timed) {
      _startCountdownTimer();
      await _startSingleChant();
    }
  }

  Future<void> _completeSession({bool dueToTimer = false}) async {
    if (_sessionId == null ||
        (_status != SadhanaSessionStatus.active &&
            _status != SadhanaSessionStatus.paused)) {
      return;
    }

    _countdownTimer?.cancel();
    _sessionStopwatch.stop();
    await _audioPlayer.stop();
    await _repository.completeSession(
      sessionId: _sessionId!,
      completedCount: _completedCount,
      durationSeconds: _elapsed.inSeconds,
    );

    final finalCount = _completedCount;
    final mode = _mode;
    final timedMinutes = _timedDuration.inMinutes;

    if (!mounted) return;
    setState(() {
      _status = SadhanaSessionStatus.completed;
      _isPlaying = false;
      _showMantra = false;
      _sessionId = null;
    });

    await WakelockPlus.disable();

    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(dueToTimer ? 'Timed session complete' : 'Sadhana complete'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Deity: ${_deity.displayName}'),
            Text('Mode: ${mode.label}'),
            Text('Completed chants: $finalCount'),
            if (mode == SadhanaSessionMode.timed)
              Text('Configured duration: $timedMinutes minutes')
            else
              Text('Target: $_targetCount'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _resetSession() async {
    final isRunning = _status == SadhanaSessionStatus.active;
    final isPaused = _status == SadhanaSessionStatus.paused;
    if (_sessionId != null && (isRunning || isPaused)) {
      _countdownTimer?.cancel();
      _sessionStopwatch.stop();
      await _audioPlayer.stop();
      await _repository.cancelSession(
        sessionId: _sessionId!,
        completedCount: _completedCount,
        durationSeconds: _elapsed.inSeconds,
      );
    }

    if (!mounted) return;
    setState(() {
      _sessionId = null;
      _status = null;
      _completedCount = 0;
      _targetCount = _deity.defaultTargetCount;
      _targetController.text = _targetCount.toString();
      _timedDuration = const Duration(minutes: _defaultTimedMinutes);
      _durationController.text = '$_defaultTimedMinutes';
      _remainingDuration = _timedDuration;
      _isPlaying = false;
      _showMantra = false;
    });

    _sessionStopwatch = Stopwatch();
    await WakelockPlus.disable();
  }

  Widget _buildModeSelector() {
    return SegmentedButton<SadhanaSessionMode>(
      segments: SadhanaSessionMode.values
          .map(
            (mode) => ButtonSegment<SadhanaSessionMode>(
              value: mode,
              label: Text(mode.label),
            ),
          )
          .toList(growable: false),
      selected: {_mode},
      onSelectionChanged: _isActive || _isPaused
          ? null
          : (selection) {
              setState(() {
                _mode = selection.first;
                if (_mode != SadhanaSessionMode.timed) {
                  _showMantra = false;
                }
              });
            },
    );
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final progressDenominator = _mode == SadhanaSessionMode.timed
        ? (_timedDuration.inSeconds == 0 ? 1 : _timedDuration.inSeconds)
        : (_targetCount == 0 ? 1 : _targetCount);
    final progressNumerator = _mode == SadhanaSessionMode.timed
        ? (_timedDuration.inSeconds - _remainingDuration.inSeconds)
            .clamp(0, _timedDuration.inSeconds)
        : _completedCount.clamp(0, _targetCount);

    return Scaffold(
      appBar: AppBar(title: Text(_deity.displayName)),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final imageCardWidth = constraints.maxWidth < 360
                ? 148.0
                : constraints.maxWidth < 420
                    ? 168.0
                    : 196.0;
            final compactControls = constraints.maxWidth < 380;
            final actionButtonWidth = compactControls
                ? (constraints.maxWidth - 40) / 2
                : null;
            final manualPrimaryLabel = compactControls ? 'Count' : 'Add Chant';
            final audioIdleLabel = compactControls ? 'Play Chant' : 'Play Single Chant';
            final timedIdleLabel = compactControls ? 'Auto Ready' : 'Auto mode running';
            final activeAudioLabel = compactControls ? 'Chanting' : 'Chanting…';
            final activeTimedLabel = compactControls ? 'Auto On' : 'Auto chanting…';

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight - 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: imageCardWidth,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surface,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.32),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.12),
                              blurRadius: 18,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                        child: AspectRatio(
                          aspectRatio: 3 / 4,
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(18),
                            child: Image.asset(
                              _deity.imageAsset,
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_showMantra)
                      Text(
                        _deity.mantraText,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    const SizedBox(height: 12),
                    _buildModeSelector(),
                    const SizedBox(height: 12),
                    if (_mode != SadhanaSessionMode.timed) ...[
                      TextField(
                        controller: _targetController,
                        enabled: !_isActive && !_isPaused,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Target count',
                          helperText: 'Used for manual/audio sessions',
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (_mode == SadhanaSessionMode.timed) ...[
                      TextField(
                        controller: _durationController,
                        enabled: !_isActive && !_isPaused,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Timed duration (minutes)',
                          helperText: 'Used for timed auto sessions',
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    const SizedBox(height: 10),
                    LinearProgressIndicator(
                      value: progressNumerator / progressDenominator,
                      minHeight: 8,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _SessionInfoChip(
                            label: _mode == SadhanaSessionMode.timed
                                ? 'Remaining'
                                : 'Count',
                            value: _mode == SadhanaSessionMode.timed
                                ? _formatDuration(_remainingDuration)
                                : '$_completedCount / $_targetCount',
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _SessionInfoChip(
                            label: 'Elapsed',
                            value: _formatDuration(_elapsed),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      alignment: WrapAlignment.center,
                      children: [
                        _SessionActionButton(
                          label: 'Start',
                          icon: Icons.play_arrow_rounded,
                          width: actionButtonWidth,
                          compact: compactControls,
                          onPressed: (_isActive || _isPaused) ? null : _startSession,
                        ),
                        _SessionActionButton(
                          label: 'Pause',
                          icon: Icons.pause_rounded,
                          width: actionButtonWidth,
                          compact: compactControls,
                          onPressed: _isActive ? _pauseSession : null,
                        ),
                        _SessionActionButton(
                          label: 'Resume',
                          icon: Icons.play_circle_outline_rounded,
                          width: actionButtonWidth,
                          compact: compactControls,
                          onPressed: _isPaused ? _resumeSession : null,
                        ),
                        _SessionActionButton(
                          label: 'Complete',
                          icon: Icons.check_circle_outline_rounded,
                          width: actionButtonWidth,
                          compact: compactControls,
                          onPressed:
                              (_isActive || _isPaused) ? _completeSession : null,
                        ),
                        _SessionActionButton(
                          label: 'Reset',
                          icon: Icons.refresh_rounded,
                          width: actionButtonWidth,
                          compact: compactControls,
                          outlined: true,
                          onPressed: _resetSession,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_mode == SadhanaSessionMode.manual)
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _isActive ? _manualTap : null,
                          child: Text(manualPrimaryLabel, textAlign: TextAlign.center),
                        ),
                      )
                    else
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: (_isActive && _mode == SadhanaSessionMode.audio)
                              ? _startSingleChant
                              : null,
                          child: Text(
                            _mode == SadhanaSessionMode.audio
                                ? (_isPlaying ? activeAudioLabel : audioIdleLabel)
                                : (_isPlaying ? activeTimedLabel : timedIdleLabel),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _playerStateSubscription?.cancel();
    _playerCompleteSubscription?.cancel();
    _sessionStopwatch.stop();
    if (_sessionId != null &&
        (_status == SadhanaSessionStatus.active ||
            _status == SadhanaSessionStatus.paused)) {
      unawaited(
        _repository.cancelSession(
          sessionId: _sessionId!,
          completedCount: _completedCount,
          durationSeconds: _elapsed.inSeconds,
        ),
      );
    }
    unawaited(WakelockPlus.disable());
    unawaited(_audioPlayer.stop());
    unawaited(_audioPlayer.dispose());
    _targetController.dispose();
    _durationController.dispose();
    super.dispose();
  }
}


class _SessionInfoChip extends StatelessWidget {
  const _SessionInfoChip({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.18),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: textTheme.bodySmall),
          const SizedBox(height: 2),
          Text(value, style: textTheme.titleMedium),
        ],
      ),
    );
  }
}

class _SessionActionButton extends StatelessWidget {
  const _SessionActionButton({
    required this.label,
    required this.icon,
    required this.onPressed,
    required this.compact,
    this.width,
    this.outlined = false,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
  final bool compact;
  final double? width;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final child = compact
        ? (outlined
            ? OutlinedButton(
                onPressed: onPressed,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(44),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(label, textAlign: TextAlign.center),
              )
            : ElevatedButton(
                onPressed: onPressed,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(44),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(label, textAlign: TextAlign.center),
              ))
        : (outlined
            ? OutlinedButton.icon(
                onPressed: onPressed,
                icon: Icon(icon, size: 18),
                label: Text(label, textAlign: TextAlign.center),
              )
            : ElevatedButton.icon(
                onPressed: onPressed,
                icon: Icon(icon, size: 18),
                label: Text(label, textAlign: TextAlign.center),
              ));

    if (width == null) return child;

    return SizedBox(
      width: width,
      child: child,
    );
  }
}
