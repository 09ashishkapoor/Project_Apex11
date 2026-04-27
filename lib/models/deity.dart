class Deity {
  const Deity({
    required this.id,
    required this.mantraId,
    required this.displayName,
    required this.imageAsset,
    required this.audioAsset,
    required this.mantraText,
    required this.defaultTargetCount,
    this.invocation,
  });

  final String id;
  final String mantraId;
  final String displayName;
  final String imageAsset;
  final String audioAsset;
  final String mantraText;
  final int defaultTargetCount;
  final String? invocation;
}
