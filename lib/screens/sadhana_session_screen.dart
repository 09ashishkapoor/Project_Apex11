import 'dart:async';

import 'package:flutter/material.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../models/deity.dart';
import '../models/sadhana_session.dart';
import '../services/chant_audio_player.dart';
import '../services/sadhana_repository.dart';
import '../theme/app_theme.dart';
import '../widgets/altar_widgets.dart';

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
  static const int _chantsPerMala = 108;

  late final ChantAudioPlayer _audioPlayer;
  late final TextEditingController _targetController;
  late final TextEditingController _durationController;
  late final TextEditingController _roundsController;

  StreamSubscription<ChantAudioState>? _playerStateSubscription;
  StreamSubscription<void>? _playerCompleteSubscription;
  StreamSubscription<Duration>? _durationSubscription;
  Timer? _countdownTimer;
  Stopwatch _sessionStopwatch = Stopwatch();

  SadhanaSessionMode _mode = SadhanaSessionMode.manual;
  SadhanaSessionStatus? _status;
  int? _sessionId;

  late int _targetCount;
  int _targetRounds = 1;
  int _completedCount = 0;
  Duration _timedDuration = const Duration(minutes: _defaultTimedMinutes);
  Duration _remainingDuration = const Duration(minutes: _defaultTimedMinutes);

  bool _isPlaying = false;
  int _autoLoopBaseCount = 0;
  Duration? _chantDuration;
  DateTime? _currentAutoChantStartedAt;

  bool get _isActive => _status == SadhanaSessionStatus.active;
  bool get _isPaused => _status == SadhanaSessionStatus.paused;
  bool get _isTimed => _mode == SadhanaSessionMode.timed;
  bool get _isCountAuto => _mode == SadhanaSessionMode.count;
  bool get _isAutoLoop => _isTimed || _isCountAuto;

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
    _roundsController = TextEditingController(text: '$_targetRounds');
    _timedDuration = const Duration(minutes: _defaultTimedMinutes);
    _remainingDuration = _timedDuration;

    _audioPlayer = createChantAudioPlayer();
    _listenAudioPlayer();
  }

  void _listenAudioPlayer() {
    _playerStateSubscription = _audioPlayer.onStateChanged.listen((state) {
      if (!mounted) return;
      setState(() {
        _isPlaying = state == ChantAudioState.playing;
      });
    });

    _durationSubscription = _audioPlayer.onDurationChanged.listen((duration) {
      _chantDuration = duration;
    });

    _playerCompleteSubscription = _audioPlayer.onComplete.listen((_) async {
      if (!mounted) return;

      if (_isAutoLoop) {
        // Auto modes use native media looping so mobile browsers do not block
        // a fresh programmatic play() after the first chant finishes.
        await _syncAutoLoopProgress();
        return;
      }

      if (_mode == SadhanaSessionMode.audio && mounted) {
        setState(() {
          _isPlaying = false;
        });
      }

      await _incrementProgress();
    });
  }

  Future<void> _startSingleChant({bool forceRestart = false}) async {
    if (!_isActive || (!forceRestart && _isPlaying)) return;
    if (_isTimed && _remainingDuration.inSeconds <= 0) {
      return;
    }

    try {
      _currentAutoChantStartedAt = _isAutoLoop ? DateTime.now() : null;
      if (_isAutoLoop) {
        _autoLoopBaseCount = _completedCount;
      }
      if (mounted && forceRestart) {
        setState(() {
          _isPlaying = false;
        });
      }
      await _audioPlayer.playAsset(
        _deity.audioAsset,
        loop: _isAutoLoop,
      );
    } catch (error) {
      debugPrint('Unable to play ${_deity.displayName} chant audio: $error');
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

    final target = switch (_mode) {
      SadhanaSessionMode.count =>
        _parsePositiveInt(_roundsController, _targetRounds, 'Rounds') *
            _chantsPerMala,
      SadhanaSessionMode.timed => 0,
      _ => _parsePositiveInt(
          _targetController,
          _deity.defaultTargetCount,
          'Target count',
        ),
    };
    final rounds = _mode == SadhanaSessionMode.count
        ? (target ~/ _chantsPerMala)
        : _targetRounds;
    final durationMinutes = _mode == SadhanaSessionMode.timed
        ? _parsePositiveInt(
            _durationController,
            _defaultTimedMinutes,
            'Timed duration',
          )
        : _defaultTimedMinutes;
    final duration = Duration(minutes: durationMinutes);

    _targetCount = target;
    _targetRounds = rounds;
    _timedDuration = duration;
    _remainingDuration = duration;
    _completedCount = 0;
    _autoLoopBaseCount = 0;
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
    });

    await WakelockPlus.enable();

    if (_isTimed) {
      _startCountdownTimer();
      await _startSingleChant();
    } else if (_isCountAuto) {
      _startCountAutoTimer();
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
        await _syncAutoLoopProgress(finalSync: true);
        setState(() {
          _remainingDuration = Duration.zero;
        });
        timer.cancel();
        await _audioPlayer.stop();
        await _completeSession(dueToTimer: true);
        return;
      }

      await _syncAutoLoopProgress();

      if (!mounted) return;
      setState(() {
        _remainingDuration -= const Duration(seconds: 1);
      });
    });
  }

  void _startCountAutoTimer() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      if (!_isActive || !_isCountAuto) {
        timer.cancel();
        return;
      }

      await _syncAutoLoopProgress();

      if (!mounted) return;
      if (_completedCount >= _targetCount) {
        timer.cancel();
        await _audioPlayer.stop();
        await _completeSession();
      }
    });
  }

  Future<void> _syncAutoLoopProgress({bool finalSync = false}) async {
    if (!_isActive ||
        _sessionId == null ||
        !_isAutoLoop ||
        _currentAutoChantStartedAt == null) {
      return;
    }

    final chantDuration = _chantDuration;
    if (chantDuration == null || chantDuration.inMilliseconds <= 0) {
      return;
    }

    final elapsed = DateTime.now().difference(_currentAutoChantStartedAt!);
    final estimatedCount = _autoLoopBaseCount +
        (elapsed.inMilliseconds ~/ chantDuration.inMilliseconds);
    final upperBound = _isCountAuto ? _targetCount : 1 << 31;
    final nextCount = finalSync || _isCountAuto
        ? estimatedCount.clamp(_completedCount, upperBound).toInt()
        : estimatedCount;

    if (nextCount <= _completedCount) return;

    await _repository.updateProgress(
      sessionId: _sessionId!,
      completedCount: nextCount,
      durationSeconds: _elapsed.inSeconds,
    );

    if (!mounted) return;
    setState(() {
      _completedCount = nextCount;
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
            _mode == SadhanaSessionMode.audio ||
            _mode == SadhanaSessionMode.count) &&
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
    await _syncAutoLoopProgress(finalSync: true);
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
    });

    await WakelockPlus.enable();

    if (_isTimed) {
      _startCountdownTimer();
      await _startSingleChant();
    } else if (_isCountAuto) {
      _startCountAutoTimer();
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
    await _syncAutoLoopProgress(finalSync: true);
    await _audioPlayer.stop();
    await _repository.completeSession(
      sessionId: _sessionId!,
      completedCount: _completedCount,
      durationSeconds: _elapsed.inSeconds,
    );

    final finalCount = _completedCount;
    final mode = _mode;
    final timedMinutes = _timedDuration.inMinutes;
    final completedRounds = finalCount ~/ _chantsPerMala;

    if (!mounted) return;
    setState(() {
      _status = SadhanaSessionStatus.completed;
      _isPlaying = false;
      _sessionId = null;
    });

    await WakelockPlus.disable();

    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          dueToTimer ? 'Timed session complete' : 'Japa session complete',
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Deity: ${_deity.displayName}'),
            Text('Mode: ${mode.label}'),
            Text('Completed chants: $finalCount'),
            if (mode == SadhanaSessionMode.timed)
              Text('Configured duration: $timedMinutes minutes')
            else if (mode == SadhanaSessionMode.count) ...[
              Text('Rounds completed: $completedRounds / $_targetRounds'),
              Text('Target chants: $_targetCount'),
            ] else
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
      _autoLoopBaseCount = 0;
      _chantDuration = null;
      _currentAutoChantStartedAt = null;
      _targetCount = _deity.defaultTargetCount;
      _targetRounds = 1;
      _targetController.text = _targetCount.toString();
      _roundsController.text = '$_targetRounds';
      _timedDuration = const Duration(minutes: _defaultTimedMinutes);
      _durationController.text = '$_defaultTimedMinutes';
      _remainingDuration = _timedDuration;
      _isPlaying = false;
    });

    _sessionStopwatch = Stopwatch();
    await WakelockPlus.disable();
  }

  Widget _buildModeSelector() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: SegmentedButton<SadhanaSessionMode>(
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
                });
              },
      ),
    );
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final completedRounds =
        (_completedCount ~/ _chantsPerMala).clamp(0, _targetRounds).toInt();
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
            final imageWidth = constraints.maxWidth < 380 ? 126.0 : 160.0;
            final hasStarted = _status != null;
            final isIdle = !_isActive && !_isPaused;
            final primaryValue = switch (_mode) {
              SadhanaSessionMode.timed => _formatDuration(_remainingDuration),
              SadhanaSessionMode.count => '$completedRounds / $_targetRounds',
              _ => '$_completedCount',
            };
            final primaryLabel = switch (_mode) {
              SadhanaSessionMode.timed => 'Remaining',
              SadhanaSessionMode.count =>
                'Malas completed - $_completedCount / $_targetCount chants',
              _ => 'Completed chants',
            };

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: ConstrainedBox(
                constraints:
                    BoxConstraints(minHeight: constraints.maxHeight - 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        FramedDeityImage(
                          deity: _deity,
                          width: imageWidth,
                          fit: BoxFit.cover,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: AltarPanel(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  hasStarted
                                      ? primaryValue
                                      : _deity.displayName,
                                  style: hasStarted
                                      ? textTheme.metric
                                      : textTheme.headlineSmall,
                                  maxLines: hasStarted ? 1 : 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  hasStarted
                                      ? primaryLabel
                                      : _deity.invocation ?? '',
                                  style: textTheme.bodyMedium,
                                ),
                                const SizedBox(height: 12),
                                LinearProgressIndicator(
                                  value:
                                      progressNumerator / progressDenominator,
                                  minHeight: 8,
                                  borderRadius: BorderRadius.circular(100),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    AltarPanel(
                      child: Text(
                        _deity.mantraText,
                        textAlign: TextAlign.center,
                        style: textTheme.mantra,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (isIdle) ...[
                      AltarPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text('Session Mode', style: textTheme.sectionTitle),
                            const SizedBox(height: 12),
                            _buildModeSelector(),
                            const SizedBox(height: 14),
                            if (_mode == SadhanaSessionMode.timed)
                              TextField(
                                controller: _durationController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  labelText: 'Timed duration (minutes)',
                                  helperText: 'Automatic audio loop',
                                ),
                              )
                            else if (_mode == SadhanaSessionMode.count)
                              TextField(
                                controller: _roundsController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  labelText: 'Rounds of 108',
                                  helperText:
                                      'Automatic loop until malas are complete',
                                ),
                              )
                            else
                              TextField(
                                controller: _targetController,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  labelText: 'Target count',
                                  helperText: 'Manual and audio sessions',
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        onPressed: _startSession,
                        icon: const Icon(Icons.play_arrow_rounded),
                        label: const Text('Start'),
                      ),
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: SessionMetric(
                              label: _mode == SadhanaSessionMode.timed
                                  ? 'Duration'
                                  : _mode == SadhanaSessionMode.count
                                      ? 'Malas'
                                      : 'Target',
                              value: _mode == SadhanaSessionMode.timed
                                  ? '${_timedDuration.inMinutes}m'
                                  : _mode == SadhanaSessionMode.count
                                      ? '$_targetRounds x 108'
                                      : '$_targetCount',
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: SessionMetric(
                              label: 'Elapsed',
                              value: _formatDuration(_elapsed),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (_isActive && _mode == SadhanaSessionMode.manual)
                        _CountButton(onPressed: _manualTap)
                      else if (_isActive && _mode == SadhanaSessionMode.audio)
                        FilledButton.icon(
                          onPressed: _isPlaying
                              ? null
                              : () => _startSingleChant(forceRestart: true),
                          icon: Icon(_isPlaying
                              ? Icons.graphic_eq_rounded
                              : Icons.volume_up_rounded),
                          label:
                              Text(_isPlaying ? 'Chanting...' : 'Play Chant'),
                        )
                      else if (_isActive && _mode == SadhanaSessionMode.timed)
                        FilledButton.icon(
                          onPressed: null,
                          icon: const Icon(Icons.graphic_eq_rounded),
                          label: Text(
                              _isPlaying ? 'Auto Chanting...' : 'Listening'),
                        )
                      else if (_isActive && _mode == SadhanaSessionMode.count)
                        FilledButton.icon(
                          onPressed: null,
                          icon: const Icon(Icons.graphic_eq_rounded),
                          label: Text(
                              _isPlaying ? 'Auto Chanting...' : 'Listening'),
                        ),
                      const SizedBox(height: 12),
                      if (_isActive)
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _pauseSession,
                                icon: const Icon(Icons.pause_rounded),
                                label: const Text('Pause'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: _completeSession,
                                icon: const Icon(Icons.check_rounded),
                                label: const Text('Complete'),
                              ),
                            ),
                          ],
                        )
                      else if (_isPaused)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            ElevatedButton.icon(
                              onPressed: _resumeSession,
                              icon: const Icon(Icons.play_arrow_rounded),
                              label: const Text('Resume'),
                            ),
                            const SizedBox(height: 10),
                            OutlinedButton.icon(
                              onPressed: _completeSession,
                              icon: const Icon(
                                  Icons.check_circle_outline_rounded),
                              label: const Text('Complete'),
                            ),
                            const SizedBox(height: 10),
                            TextButton.icon(
                              onPressed: _resetSession,
                              icon: const Icon(Icons.refresh_rounded),
                              label: const Text('Reset'),
                            ),
                          ],
                        ),
                    ],
                    if (_isPlaying) ...[
                      const SizedBox(height: 12),
                      Text(
                        'Audio active',
                        textAlign: TextAlign.center,
                        style: textTheme.bodySmall?.copyWith(
                          color: AppTheme.softGold,
                        ),
                      ),
                    ],
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
    _durationSubscription?.cancel();
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
    _roundsController.dispose();
    super.dispose();
  }
}

class _CountButton extends StatelessWidget {
  const _CountButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 112,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: AppTheme.softGold,
          foregroundColor: AppTheme.templeVoid,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.touch_app_rounded, size: 34),
            SizedBox(height: 8),
            Text('Count Chant'),
          ],
        ),
      ),
    );
  }
}
