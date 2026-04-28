import 'package:flutter/material.dart';

import 'data/app_database.dart';
import 'screens/dedication_splash_screen.dart';
import 'screens/deity_selection_screen.dart';
import 'screens/sadhana_session_screen.dart';
import 'screens/sadhana_tracker_screen.dart';
import 'screens/welcome_screen.dart';
import 'services/sadhana_repository.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final database = AppDatabase();
  final repository = SadhanaRepository(database);
  runApp(MyApp(database: database, repository: repository));
}

class MyApp extends StatefulWidget {
  const MyApp({
    super.key,
    required this.database,
    required this.repository,
  });

  final AppDatabase database;
  final SadhanaRepository repository;

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void dispose() {
    widget.database.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MANTRINI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      initialRoute: '/dedication',
      routes: {
        '/dedication': (_) => const DedicationSplashScreen(),
        '/welcome': (_) => WelcomeScreen(repository: widget.repository),
        '/deities': (_) => DeitySelectionScreen(repository: widget.repository),
        '/tracker': (_) => SadhanaTrackerScreen(repository: widget.repository),
        '/session': (context) {
          final args = ModalRoute.of(context)?.settings.arguments;
          if (args is! SessionScreenArgs) {
            return const _RouteErrorScreen();
          }
          return SadhanaSessionScreen(
            deity: args.deity,
            repository: args.repository,
          );
        },
      },
    );
  }
}

class _RouteErrorScreen extends StatelessWidget {
  const _RouteErrorScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('MANTRINI')),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child:
              Text('Unable to open this screen. Please return and try again.'),
        ),
      ),
    );
  }
}
