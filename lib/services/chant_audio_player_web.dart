// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:async';
import 'dart:html' as html;

import 'chant_audio_player.dart';

class WebChantAudioPlayer implements ChantAudioPlayer {
  WebChantAudioPlayer() {
    _audio = html.AudioElement()
      ..preload = 'auto'
      ..controls = false;

    _subscriptions.addAll([
      _audio.onPlay.listen((_) {
        _stateController.add(ChantAudioState.playing);
      }),
      _audio.onPause.listen((_) {
        _stateController.add(ChantAudioState.stopped);
      }),
      _audio.onEnded.listen((_) {
        _stateController.add(ChantAudioState.stopped);
        _completeController.add(null);
      }),
      _audio.onLoadedMetadata.listen((_) {
        final seconds = _audio.duration;
        if (seconds.isFinite && seconds > 0) {
          _durationController.add(
            Duration(milliseconds: (seconds * 1000).round()),
          );
        }
      }),
    ]);
  }

  late final html.AudioElement _audio;
  final _stateController = StreamController<ChantAudioState>.broadcast();
  final _durationController = StreamController<Duration>.broadcast();
  final _completeController = StreamController<void>.broadcast();
  final List<StreamSubscription<Object?>> _subscriptions = [];
  String? _currentSource;

  @override
  Stream<ChantAudioState> get onStateChanged => _stateController.stream;

  @override
  Stream<Duration> get onDurationChanged => _durationController.stream;

  @override
  Stream<void> get onComplete => _completeController.stream;

  @override
  Future<void> playAsset(String assetPath, {required bool loop}) async {
    final source = _webAssetPath(assetPath);
    if (_currentSource != source) {
      _audio.src = source;
      _currentSource = source;
      _audio.load();
    }

    _audio.loop = loop;
    _audio.pause();

    try {
      _audio.currentTime = 0;
    } catch (_) {
      // Some mobile browsers reject seeks until metadata has loaded.
    }

    await _audio.play();
    _stateController.add(ChantAudioState.playing);
  }

  @override
  Future<void> stop() async {
    _audio.pause();
    try {
      _audio.currentTime = 0;
    } catch (_) {}
    _audio.loop = false;
    _stateController.add(ChantAudioState.stopped);
  }

  @override
  Future<void> dispose() async {
    await stop();
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    _audio.removeAttribute('src');
    _audio.load();
    await _stateController.close();
    await _durationController.close();
    await _completeController.close();
  }

  String _webAssetPath(String assetPath) {
    final normalized =
        assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;
    return 'assets/$normalized';
  }
}

ChantAudioPlayer createPlatformChantAudioPlayer() => WebChantAudioPlayer();
