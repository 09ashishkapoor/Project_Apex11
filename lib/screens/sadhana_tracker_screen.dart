import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SadhanaTrackerScreen extends StatefulWidget {
  const SadhanaTrackerScreen({Key? key}) : super(key: key);

  @override
  State<SadhanaTrackerScreen> createState() => _SadhanaTrackerScreenState();
}

class _SadhanaTrackerScreenState extends State<SadhanaTrackerScreen> {
  final List<String> deities = [
    'Batuk Bhairav',
    'Swarnaakarshana Bhairav',
    'Skanda Bhairav',
    'Adya MahaKaali',
  ];

  final Map<String, String> deityImages = {
    'Batuk Bhairav': 'assets/images/batuk.jpg',
    'Swarnaakarshana Bhairav': 'assets/images/swarna.jpg',
    'Skanda Bhairav': 'assets/images/skanda.jpg',
    'Adya MahaKaali': 'assets/images/maha.jpg',
  };

  Map<String, int> sadhanaCounts = {};

  @override
  void initState() {
    super.initState();
    _loadSadhanaData();
  }

  Future<void> _loadSadhanaData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      for (var deity in deities) {
        sadhanaCounts[deity] = prefs.getInt('$deity-count') ?? 0;
      }
    });
  }

  Future<void> _resetSadhanaCount(String deity) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('$deity-count', 0);
    setState(() {
      sadhanaCounts[deity] = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sadhana Tracker'),
        backgroundColor: Colors.black,
        centerTitle: true,
        elevation: 0,
      ),
      backgroundColor: Colors.black,
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Your Spiritual Journey',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Track your progress in each deity\'s sadhana',
              style: TextStyle(fontSize: 16, color: Colors.white70),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ListView.builder(
                itemCount: deities.length,
                itemBuilder: (context, index) {
                  final deity = deities[index];
                  final count = sadhanaCounts[deity] ?? 0;
                  final imagePath = deityImages[deity] ?? '';

                  return _buildDeityCard(deity, count, imagePath);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeityCard(String deity, int count, String imagePath) {
    final percentage = count / 108;
    final percentageText = '${(percentage * 100).toStringAsFixed(1)}%';
    final rounds = (count / 108).floor();
    final remainingForNextRound = 108 - (count % 108);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: Colors.grey[900],
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.asset(
                    imagePath,
                    width: 60,
                    height: 60,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        deity,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        '$count chants completed',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.orange[300],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, color: Colors.white70),
                  onPressed: () => _showResetDialog(deity),
                ),
              ],
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(
              value: percentage > 1 ? 1 : percentage,
              minHeight: 10,
              backgroundColor: Colors.grey[800],
              valueColor: AlwaysStoppedAnimation<Color>(
                _getProgressColor(percentage),
              ),
              borderRadius: BorderRadius.circular(5),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Progress: $percentageText',
                  style: const TextStyle(fontSize: 12, color: Colors.white70),
                ),
                Text(
                  'Rounds: $rounds',
                  style: const TextStyle(fontSize: 12, color: Colors.white70),
                ),
              ],
            ),
            if (count % 108 != 0)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: Text(
                  '$remainingForNextRound more for next round',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.orange[200],
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Color _getProgressColor(double percentage) {
    if (percentage < 0.3) return Colors.red;
    if (percentage < 0.6) return Colors.orange;
    if (percentage < 1) return Colors.yellow;
    return Colors.green;
  }

  void _showResetDialog(String deity) {
    showDialog(
      context: context,
      builder:
          (context) => AlertDialog(
            backgroundColor: Colors.grey[900],
            title: Text(
              'Reset $deity Sadhana?',
              style: const TextStyle(color: Colors.white),
            ),
            content: Text(
              'Are you sure you want to reset your $deity sadhana count?',
              style: const TextStyle(color: Colors.white70),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              TextButton(
                onPressed: () {
                  _resetSadhanaCount(deity);
                  Navigator.pop(context);
                },
                child: const Text('Reset', style: TextStyle(color: Colors.red)),
              ),
            ],
          ),
    );
  }
}
