import 'package:flutter/material.dart';
import 'screens/welcome_screen.dart';
import 'screens/sadhana_tracker_screen.dart'; // Add this import

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Adya Mahakali Sadhana',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.deepOrange,
        scaffoldBackgroundColor: Colors.black,
      ),
      home: const WelcomeScreen(),
      routes: {'/tracker': (context) => const SadhanaTrackerScreen()},
    );
  }
}
