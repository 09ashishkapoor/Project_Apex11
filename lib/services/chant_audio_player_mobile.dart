import 'dart:async';

import 'package:audioplayers/audioplayers.dart';

import 'chant_audio_player.dart';

class MobileChantAudioPlayer implements ChantAudioPlayer {
  MobileChantAudioPlayer() {
    _stateSubscription = _player.onPlayerStateChanged.listen((state) {
      _stateController.add(
        state == PlayerState.playing
            ? ChantAudioState.playing
            : ChantAudioState.stopped,
      );
    });
    _durationSubscription = _player.onDurationChanged.listen(
      _durationController.add,
    );
    _completeSubscription = _player.onPlayerComplete.listen((_) {
      _completeController.add(null);
    });
  }

  final AudioPlayer _player = AudioPlayer();
  final _stateController = StreamController<ChantAudioState>.broadcast();
  final _durationController = StreamController<Duration>.broadcast();
  final _completeController = StreamController<void>.broadcast();

  StreamSubscription<PlayerState>? _stateSubscription;
  StreamSubscription<Duration>? _durationSubscription;
  StreamSubscription<void>? _completeSubscription;

  @override
  Stream<ChantAudioState> get onStateChanged => _stateController.stream;

  @override
  Stream<Duration> get onDurationChanged => _durationController.stream;

  @override
  Stream<void> get onComplete => _completeController.stream;

  @override
  Future<void> playAsset(String assetPath, {required bool loop}) async {
    await _player.setReleaseMode(loop ? ReleaseMode.loop : ReleaseMode.stop);
    await _player.stop();
    await _player.play(AssetSource(_audioRelativePath(assetPath)));
  }

  @override
  Future<void> stop() async {
    await _player.stop();
    _stateController.add(ChantAudioState.stopped);
  }

  @override
  Future<void> dispose() async {
    await _stateSubscription?.cancel();
    await _durationSubscription?.cancel();
    await _completeSubscription?.cancel();
    await _player.dispose();
    await _stateController.close();
    await _durationController.close();
    await _completeController.close();
  }

  String _audioRelativePath(String assetPath) {
    if (assetPath.startsWith('assets/')) {
      return assetPath.substring('assets/'.length);
    }
    return assetPath;
  }
}

ChantAudioPlayer createPlatformChantAudioPlayer() => MobileChantAudioPlayer();
