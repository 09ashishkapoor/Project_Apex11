import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SadhanaSessionScreen extends StatefulWidget {
  final String deityName;
  final String deityImage;
  final String mantraAudio;
  final String mantraText;

  const SadhanaSessionScreen({
    super.key,
    required this.deityName,
    required this.deityImage,
    required this.mantraAudio,
    required this.mantraText,
  });

  @override
  State<SadhanaSessionScreen> createState() => _SadhanaSessionScreenState();
}

class _SadhanaSessionScreenState extends State<SadhanaSessionScreen> {
  int _counter = 0;
  late AudioPlayer _audioPlayer;
  bool _isPlaying = false;
  bool _showMantra = false;
  bool _showGlow = false;
  bool _isAutoMode = false;
  int _manualTargetCount = 108;
  int _autoDurationMinutes = 5;
  late Duration _remainingTime;
  bool _isTimerRunning = false;

  @override
  void initState() {
    super.initState();
    _audioPlayer = AudioPlayer();
    _remainingTime = Duration(minutes: _autoDurationMinutes);
    _setupAudioListeners();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _showModeSelectionDialog();
    });
  }

  void _setupAudioListeners() {
    _audioPlayer.onPlayerStateChanged.listen((state) {
      if (mounted) {
        setState(() {
          _isPlaying = state == PlayerState.playing;
          _showMantra = _isPlaying;
          _showGlow = _isPlaying;
        });
      }
    });

    _audioPlayer.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _isPlaying = false;
          _showMantra = false;
          _showGlow = false;
          _counter++;
        });

        if (!_isAutoMode && _counter >= _manualTargetCount) {
          _showCompletionDialog();
        } else if (_isAutoMode && _isTimerRunning) {
          _playMantra();
        }
      }
    });
  }

  Future<void> _playMantra() async {
    if (_isPlaying) return;

    try {
      await _audioPlayer.stop();
      // Try multiple possible audio paths
      try {
        await _audioPlayer.play(
          AssetSource('assets/audio/${widget.mantraAudio}'),
        );
      } catch (firstError) {
        debugPrint('First attempt failed: $firstError');
        try {
          await _audioPlayer.play(AssetSource('audio/${widget.mantraAudio}'));
        } catch (secondError) {
          debugPrint('Second attempt failed: $secondError');
          rethrow;
        }
      }

      if (mounted) {
        setState(() {
          _isPlaying = true;
        });
      }
    } catch (e) {
      debugPrint('Final audio error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Failed to play audio:',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                Text('File: ${widget.mantraAudio}'),
                Text('Error: ${e.toString()}'),
                const Text('Check pubspec.yaml and file location'),
              ],
            ),
            duration: const Duration(seconds: 5),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _saveSadhanaCount() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('${widget.deityName}-count', _counter);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.deityName),
        backgroundColor: Colors.black,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _showModeSelectionDialog,
            tooltip: 'Change chanting mode',
          ),
        ],
      ),
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            // Divine Image with Glow Effect
            Flexible(
              flex: 3,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(15),
                    boxShadow:
                        _showGlow
                            ? [
                              BoxShadow(
                                color: Colors.orange.withOpacity(0.8),
                                blurRadius: 25,
                                spreadRadius: 3,
                              ),
                              BoxShadow(
                                color: Colors.deepOrange.withOpacity(0.6),
                                blurRadius: 40,
                                spreadRadius: 5,
                              ),
                            ]
                            : [
                              BoxShadow(
                                color: Colors.deepOrange.withOpacity(0.3),
                                blurRadius: 15,
                                spreadRadius: 1,
                              ),
                            ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(15),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.asset(
                          widget.deityImage,
                          fit: BoxFit.cover,
                          errorBuilder:
                              (context, error, stackTrace) => const Center(
                                child: Icon(
                                  Icons.error,
                                  color: Colors.red,
                                  size: 50,
                                ),
                              ),
                        ),
                        if (_showMantra)
                          Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [
                                  Colors.black.withOpacity(0.5),
                                  Colors.transparent,
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Mantra at Feet
            if (_showMantra)
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    widget.mantraText,
                    style: const TextStyle(
                      fontSize: 20,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),

            // Counter and Button Section
            Flexible(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (_isAutoMode) ...[
                      const Text(
                        'Remaining Time:',
                        style: TextStyle(fontSize: 16, color: Colors.white70),
                      ),
                      Text(
                        '${_remainingTime.inMinutes}:${(_remainingTime.inSeconds % 60).toString().padLeft(2, '0')}',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 85,
                          height: 85,
                          child: CircularProgressIndicator(
                            value:
                                _isAutoMode
                                    ? 1 -
                                        (_remainingTime.inSeconds /
                                            (_autoDurationMinutes * 60))
                                    : _counter / _manualTargetCount,
                            strokeWidth: 6,
                            backgroundColor: Colors.grey.withOpacity(0.2),
                            color: Colors.deepOrange,
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '$_counter',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              _isAutoMode ? 'chants' : 'of $_manualTargetCount',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.white70,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (!_isAutoMode || !_isTimerRunning)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _playMantra,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            backgroundColor:
                                _isPlaying
                                    ? Colors.orange[800]
                                    : Colors.deepOrange,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(25),
                            ),
                          ),
                          child: Text(
                            _isPlaying ? 'Chanting...' : 'Chant Mantra',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    if (_isAutoMode && _isTimerRunning)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _stopAutoMode,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            backgroundColor: Colors.red,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(25),
                            ),
                          ),
                          child: const Text(
                            'Stop',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showModeSelectionDialog() async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder:
          (context) => AlertDialog(
            backgroundColor: Colors.black.withOpacity(0.9),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Colors.deepOrange, width: 2),
            ),
            title: const Text(
              'Select Chanting Mode',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _setManualMode();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepOrange,
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                  ),
                  child: const Text(
                    'Manual Chanting',
                    style: TextStyle(fontSize: 16),
                  ),
                ),
                const SizedBox(height: 15),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    _setAutoMode();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepOrange,
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                  ),
                  child: const Text(
                    'Automatic Chanting',
                    style: TextStyle(fontSize: 16),
                  ),
                ),
              ],
            ),
          ),
    );
  }

  void _setManualMode() {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            backgroundColor: Colors.black.withOpacity(0.9),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Colors.deepOrange, width: 2),
            ),
            title: const Text(
              'Manual Chanting',
              style: TextStyle(fontSize: 20, color: Colors.white),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'How many times do you want to chant?',
                  style: TextStyle(fontSize: 16, color: Colors.white70),
                ),
                const SizedBox(height: 16),
                TextField(
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Enter count (default 108)',
                    hintStyle: const TextStyle(color: Colors.white70),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Colors.deepOrange),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Colors.deepOrange),
                    ),
                  ),
                  onChanged: (value) {
                    if (value.isNotEmpty) {
                      setState(() {
                        _manualTargetCount = int.tryParse(value) ?? 108;
                      });
                    }
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  setState(() {
                    _isAutoMode = false;
                    _counter = 0;
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.deepOrange,
                ),
                child: const Text('Confirm'),
              ),
            ],
          ),
    );
  }

  void _setAutoMode() {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            backgroundColor: Colors.black.withOpacity(0.9),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Colors.deepOrange, width: 2),
            ),
            title: const Text(
              'Automatic Chanting',
              style: TextStyle(fontSize: 20, color: Colors.white),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'For how many minutes?',
                  style: TextStyle(fontSize: 16, color: Colors.white70),
                ),
                const SizedBox(height: 16),
                TextField(
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Enter minutes (default 5)',
                    hintStyle: const TextStyle(color: Colors.white70),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Colors.deepOrange),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Colors.deepOrange),
                    ),
                  ),
                  onChanged: (value) {
                    if (value.isNotEmpty) {
                      setState(() {
                        _autoDurationMinutes = int.tryParse(value) ?? 5;
                        _remainingTime = Duration(
                          minutes: _autoDurationMinutes,
                        );
                      });
                    }
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  setState(() {
                    _isAutoMode = true;
                    _counter = 0;
                    _startAutoMode();
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.deepOrange,
                ),
                child: const Text('Start'),
              ),
            ],
          ),
    );
  }

  void _startAutoMode() {
    setState(() {
      _isTimerRunning = true;
    });
    _playMantra();
    _startTimer();
  }

  void _startTimer() {
    Future.delayed(const Duration(seconds: 1), () {
      if (_isTimerRunning && mounted) {
        setState(() {
          _remainingTime = _remainingTime - const Duration(seconds: 1);
        });
        if (_remainingTime.inSeconds <= 0) {
          _stopAutoMode();
        } else {
          _startTimer();
        }
      }
    });
  }

  void _stopAutoMode() {
    setState(() {
      _isTimerRunning = false;
      _isPlaying = false;
    });
    _audioPlayer.stop();
    _showCompletionDialog();
  }

  void _showCompletionDialog() {
    _saveSadhanaCount();
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            backgroundColor: Colors.black.withOpacity(0.9),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Colors.deepOrange, width: 2),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 50),
                const SizedBox(height: 16),
                Text(
                  _isAutoMode ? 'Time Complete!' : 'Sadhana Complete!',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _isAutoMode
                      ? 'Completed $_counter chants in $_autoDurationMinutes minutes'
                      : 'Completed $_manualTargetCount chants of ${widget.deityName}',
                  style: const TextStyle(fontSize: 16, color: Colors.white70),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
            actions: [
              Center(
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.deepOrange,
                    minimumSize: const Size(120, 40),
                  ),
                  child: const Text(
                    'Jai Bhairav',
                    style: TextStyle(fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
    );
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }
}
