import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sadhana_for_a_khyapa/data/app_database.dart';
import 'package:sadhana_for_a_khyapa/main.dart';
import 'package:sadhana_for_a_khyapa/services/sadhana_repository.dart';

const List<int> _kTransparentImage = <int>[
  0x89,
  0x50,
  0x4E,
  0x47,
  0x0D,
  0x0A,
  0x1A,
  0x0A,
  0x00,
  0x00,
  0x00,
  0x0D,
  0x49,
  0x48,
  0x44,
  0x52,
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01,
  0x08,
  0x06,
  0x00,
  0x00,
  0x00,
  0x1F,
  0x15,
  0xC4,
  0x89,
  0x00,
  0x00,
  0x00,
  0x0A,
  0x49,
  0x44,
  0x41,
  0x54,
  0x78,
  0x9C,
  0x63,
  0x00,
  0x01,
  0x00,
  0x00,
  0x05,
  0x00,
  0x01,
  0x0D,
  0x0A,
  0x2D,
  0xB4,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4E,
  0x44,
  0xAE,
  0x42,
  0x60,
  0x82,
];

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    final transparentImage = ByteData.view(
      Uint8List.fromList(_kTransparentImage).buffer,
    );
    final emptyAssetManifest =
        const StandardMessageCodec().encodeMessage(<Object?, Object?>{})!;

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMessageHandler(
      'flutter/assets',
      (message) async {
        final key = const StringCodec().decodeMessage(message);
        if (key == 'AssetManifest.bin') {
          return emptyAssetManifest;
        }
        if (key != null && key.startsWith('assets/')) {
          return transparentImage;
        }
        return null;
      },
    );
  });

  tearDownAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMessageHandler(
      'flutter/assets',
      null,
    );
  });

  testWidgets('shows welcome actions and navigates to tracker', (tester) async {
    final database = AppDatabase(
      DatabaseConnection(
        NativeDatabase.memory(),
        closeStreamsSynchronously: true,
      ),
    );
    final repository = SadhanaRepository(database);

    await tester.pumpWidget(MyApp(database: database, repository: repository));
    await tester.pumpAndSettle();

    expect(find.text('Sadhana for a Khyapa'), findsOneWidget);
    expect(find.text('Begin Japa'), findsOneWidget);
    expect(find.text('View Sadhana Tracker'), findsOneWidget);

    await tester.ensureVisible(find.text('View Sadhana Tracker'));
    await tester.tap(find.text('View Sadhana Tracker'));
    await tester.pumpAndSettle();

    expect(find.text('Sadhana Tracker'), findsOneWidget);
  });
}
