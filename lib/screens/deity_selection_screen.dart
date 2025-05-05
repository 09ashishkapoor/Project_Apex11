import 'package:flutter/material.dart';
import 'sadhana_session_screen.dart';

class DeitySelectionScreen extends StatelessWidget {
  DeitySelectionScreen({super.key});

  final List<Map<String, String>> deities = [
    {
      'name': 'Batuk Bhairav',
      'image': 'assets/images/batuk.jpg',
      'audio': 'batuk.mp3',
      'mantra': 'ॐ बटुक भैरवाय नमः',
    },
    {
      'name': 'Swarnaakarshana Bhairav',
      'image': 'assets/images/swarna.jpg',
      'audio': 'swarna.mp3',
      'mantra': 'ॐ श्री स्वर्णाकर्षण भैरवाय नमः',
    },
    {
      'name': 'Skanda Bhairav',
      'image': 'assets/images/skanda.jpg',
      'audio': 'skanda.mp3',
      'mantra': 'ॐ सर्वान्भवाय नमः',
    },
    {
      'name': 'Adya MahaKaali',
      'image': 'assets/images/maha.jpg',
      'audio': 'maha.mp3',
      'mantra': 'ॐ आद्यायै नमः',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final itemHeight = size.height / 2;
    final itemWidth = size.width / 2;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SizedBox(
        width: size.width,
        height: size.height,
        child: GridView.count(
          crossAxisCount: 2,
          childAspectRatio: itemWidth / itemHeight,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          children:
              deities.map((deity) {
                return SizedBox(
                  width: itemWidth,
                  height: itemHeight,
                  child: GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder:
                              (_) => SadhanaSessionScreen(
                                deityName: deity['name']!,
                                deityImage: deity['image']!,
                                mantraAudio: deity['audio']!,
                                mantraText: deity['mantra']!,
                              ),
                        ),
                      );
                    },
                    child: Image.asset(deity['image']!, fit: BoxFit.cover),
                  ),
                );
              }).toList(),
        ),
      ),
    );
  }
}
