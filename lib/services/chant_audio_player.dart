import 'dart:async';

import 'chant_audio_player_stub.dart'
    if (dart.library.html) 'chant_audio_player_web.dart'
    if (dart.library.io) 'chant_audio_player_mobile.dart';

enum ChantAudioState { stopped, playing }

abstract class ChantAudioPlayer {
  Stream<ChantAudioState> get onStateChanged;
  Stream<Duration> get onDurationChanged;
  Stream<void> get onComplete;

  Future<void> playAsset(String assetPath, {required bool loop});

  Future<void> stop();

  Future<void> dispose();
}

ChantAudioPlayer createChantAudioPlayer() => createPlatformChantAudioPlayer();
