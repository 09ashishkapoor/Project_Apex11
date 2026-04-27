import '../models/deity.dart';

const List<Deity> kDeities = [
  Deity(
    id: 'adya-mahakaali',
    mantraId: 'adya-mahakaali-japa',
    displayName: 'Adya MahaKaali',
    imageAsset: 'assets/images/maha1.jpg',
    audioAsset: 'assets/audio/maha.mp3',
    mantraText: 'ॐ आद्यायै नमः',
    defaultTargetCount: 108,
    invocation: 'At the lotus feet of the primordial Mother.',
  ),
  Deity(
    id: 'batuk-bhairav',
    mantraId: 'batuk-bhairav-japa',
    displayName: 'Batuk Bhairav',
    imageAsset: 'assets/images/batuk1.jpg',
    audioAsset: 'assets/audio/batuk.mp3',
    mantraText: 'ॐ बटुक भैरवाय नमः',
    defaultTargetCount: 108,
    invocation: 'Guardian of swift grace and fearless protection.',
  ),
  Deity(
    id: 'swarnaakarshana-bhairav',
    mantraId: 'swarnaakarshana-bhairav-japa',
    displayName: 'Swarnaakarshana Bhairav',
    imageAsset: 'assets/images/swarna.jpg',
    audioAsset: 'assets/audio/swarna.mp3',
    mantraText: 'ॐ श्री स्वर्णाकर्षण भैरवाय नमः',
    defaultTargetCount: 108,
    invocation: 'For radiance, dignified prosperity, and clear intent.',
  ),
  Deity(
    id: 'skanda-bhairav',
    mantraId: 'skanda-bhairav-japa',
    displayName: 'Skanda Bhairav',
    imageAsset: 'assets/images/skanda.jpg',
    audioAsset: 'assets/audio/skanda.mp3',
    mantraText: 'ॐ सर्वान्भवाय नमः',
    defaultTargetCount: 108,
    invocation: 'For disciplined courage and focused tapas.',
  ),
];

final Map<String, Deity> kDeitiesById = {
  for (final deity in kDeities) deity.id: deity,
};
