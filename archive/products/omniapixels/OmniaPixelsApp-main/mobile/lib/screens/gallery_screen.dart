import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../widgets/premium_ui.dart';
import '../providers/theme_provider.dart';
import '../providers/gallery_provider.dart';
import '../l10n/app_localizations.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  int _gridMode = 2; // 2 or 3 columns
  String _activeFilter = 'all';
  final TextEditingController _searchController = TextEditingController();
  List<Map<String, dynamic>> _currentPhotos = [];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  final List<String> _filterKeys = [
    "all",
    "favorite",
    "enhanced",
    "upscale",
    "bg_remove",
    "deblur",
  ];

  String _getFilterLabel(String key, AppLocalizations l) {
    switch (key) {
      case 'all': return l.galleryFilterAll;
      case 'favorite': return l.galleryFilterFavorite;
      case 'enhanced': return l.galleryFilterEnhanced;
      case 'upscale': return l.galleryFilterUpscale;
      case 'bg_remove': return l.galleryFilterBgRemove;
      case 'deblur': return l.galleryFilterDeblur;
      default: return key;
    }
  }

  // Build photos list from GalleryProvider
  List<Map<String, dynamic>> _buildPhotosFromProvider(GalleryProvider gallery) {
    return gallery.items.map((item) {
      final now = DateTime.now();
      final diff = now.difference(item.createdAt);
      String dateLabel;
      if (diff.inDays == 0) {
        dateLabel = 'Bugün';
      } else if (diff.inDays == 1) {
        dateLabel = 'Dün';
      } else if (diff.inDays < 7) {
        dateLabel = '${diff.inDays} gün önce';
      } else {
        dateLabel = 'Geçen hafta';
      }

      IconData icon;
      Color iconColor;
      String type;
      switch (item.action) {
        case 'autoEnhance':
          icon = Icons.auto_awesome;
          iconColor = AppTheme.accentGold;
          type = 'AI Enhanced';
          break;
        case 'upscale2x':
          icon = Icons.zoom_out_map;
          iconColor = AppTheme.accentBlue;
          type = '2× Upscale';
          break;
        case 'denoise':
          icon = Icons.blur_off;
          iconColor = AppTheme.accentGreen;
          type = 'Deblur';
          break;
        case 'grayscale':
          icon = Icons.palette_outlined;
          iconColor = AppTheme.accentPurple;
          type = 'Siyah-Beyaz';
          break;
        case 'vignette':
          icon = Icons.vignette;
          iconColor = AppTheme.accentOrange;
          type = 'Vinyet';
          break;
        default:
          icon = Icons.auto_awesome;
          iconColor = AppTheme.accentGold;
          type = item.action;
      }

      return {
        'id': item.id,
        'bytes': item.fullBytes,
        'type': type,
        'icon': icon,
        'iconColor': iconColor,
        'starred': false,
        'date': dateLabel,
        'galleryItem': item,
      };
    }).toList();
  }

  List<Map<String, dynamic>> _getFilteredPhotos(List<Map<String, dynamic>> photos) {
    return photos
        .where((p) {
          if (_activeFilter == 'all') return true;
          if (_activeFilter == 'favorite') return p['starred'] == true;
          if (_activeFilter == 'enhanced')
            return (p['type'] as String).contains('Enhance');
          if (_activeFilter == 'upscale')
            return (p['type'] as String).contains('Upscale');
          if (_activeFilter == 'bg_remove')
            return (p['type'] as String).contains('BG');
          if (_activeFilter == 'deblur')
            return (p['type'] as String).contains('Deblur');
          return true;
        })
        .where((p) {
          if (_searchController.text.isEmpty) return true;
          return (p['type'] as String).toLowerCase().contains(
            _searchController.text.toLowerCase(),
          );
        })
        .toList();
  }

  Map<String, List<Map<String, dynamic>>> _getGroupedPhotos(List<Map<String, dynamic>> filtered) {
    final groups = <String, List<Map<String, dynamic>>>{};
    for (var photo in filtered) {
      final date = photo['date'] as String;
      if (!groups.containsKey(date)) {
        groups[date] = [];
      }
      groups[date]!.add(photo);
    }
    return groups;
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.watch<ThemeProvider>().colors;
    final l = AppLocalizations.of(context)!;
    final gallery = context.watch<GalleryProvider>();
    // Store photos for use in child methods
    _currentPhotos = _buildPhotosFromProvider(gallery);
    
    return Scaffold(
      backgroundColor: colors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildHeader(colors, l),
            _buildSearchBox(colors, l),
            _buildFilters(colors, l),
            Expanded(child: _buildGalleryContent(colors, l)),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(AppColors colors, AppLocalizations l) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l.galleryTitle,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontSize: 20,
                  letterSpacing: -0.4, // -0.02em
                ),
              ),
              const SizedBox(height: 2),
              Text(
                l.galleryEditCount(_currentPhotos.length),
                style: TextStyle(color: colors.textSecondary, fontSize: 13),
              ),
            ],
          ),
          Row(
            children: [
              InkWell(
                onTap: () => setState(() => _gridMode = _gridMode == 2 ? 3 : 2),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: colors.surfaceGlassMedium, // 0.05
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: colors.borderLight), // 0.08
                  ),
                  child: Icon(
                    _gridMode == 2
                        ? Icons.grid_on_rounded
                        : Icons.grid_view_rounded,
                    color: colors.textSecondary,
                    size: 16,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              InkWell(
                onTap: () => context.go('/editor'),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: colors.accentGold.withOpacity(0.12), // 0.12
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: colors.accentGold.withOpacity(0.2),
                    ), // 0.2
                  ),
                  child: Icon(
                    Icons.add_rounded,
                    color: colors.accentGold,
                    size: 18,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBox(AppColors colors, AppLocalizations l) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: colors.surfaceGlass, // 0.04
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: colors.borderLight), // 0.08
        ),
        child: Row(
          children: [
            Icon(Icons.search, color: colors.textMuted, size: 16),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _searchController,
                onChanged: (val) => setState(() {}),
                style: TextStyle(color: colors.textPrimary, fontSize: 14),
                cursorColor: colors.accentGold,
                decoration: InputDecoration(
                  hintText: l.gallerySearchHint,
                  hintStyle: TextStyle(color: colors.textMuted, fontSize: 14),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilters(AppColors colors, AppLocalizations l) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        scrollDirection: Axis.horizontal,
        itemCount: _filterKeys.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final filterKey = _filterKeys[index];
          final filterLabel = _getFilterLabel(filterKey, l);
          final isSelected = _activeFilter == filterKey;

          return InkWell(
            onTap: () => setState(() => _activeFilter = filterKey),
            borderRadius: BorderRadius.circular(20),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected
                    ? colors.accentGold.withOpacity(0.15)
                    : colors.surfaceGlass, // 0.15 vs 0.04
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected
                      ? colors.accentGold.withOpacity(0.25)
                      : colors.borderLight, // 0.25 vs 0.07
                ),
              ),
              child: Row(
                children: [
                  if (filterKey == 'favorite') ...[
                    Icon(
                      isSelected
                          ? Icons.star_rounded
                          : Icons.star_border_rounded,
                      color: isSelected ? colors.accentGold : colors.textMuted,
                      size: 14,
                    ),
                    const SizedBox(width: 4),
                  ],
                  Text(
                    filterLabel,
                    style: TextStyle(
                      color: isSelected ? colors.accentGold : colors.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildGalleryContent(AppColors colors, AppLocalizations l) {
    final filtered = _getFilteredPhotos(_currentPhotos);
    final groups = _getGroupedPhotos(filtered);

    if (groups.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: colors.surfaceGlass,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: colors.borderLight),
              ),
              child: Icon(
                Icons.grid_view_rounded,
                color: colors.textMuted,
                size: 28,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              l.galleryEmptyTitle,
              style: TextStyle(
                color: colors.textPrimary,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              l.galleryEmptySubtitle,
              style: TextStyle(color: colors.textMuted, fontSize: 13),
            ),
          ],
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
      children: groups.entries.map((entry) {
        final date = entry.key;
        final photos = entry.value;

        return Padding(
          padding: const EdgeInsets.only(bottom: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                (date == 'Bugün' ? l.galleryDateToday : 
                 date == 'Dün' ? l.galleryDateYesterday : date).toUpperCase(),
                style: TextStyle(
                  color: colors.textMuted,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.96, // 0.08em
                ),
              ),
              const SizedBox(height: 12),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: _gridMode,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: _gridMode == 2 ? 0.75 : 1.0,
                ),
                itemCount: photos.length,
                itemBuilder: (context, index) {
                  final photo = photos[index];

                  return AnimatedFadeInUp(
                    delay: Duration(milliseconds: index * 60),
                    child: InkWell(
                      onTap: () => context.go('/compare'),
                      borderRadius: BorderRadius.circular(16),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            photo['bytes'] != null
                                ? Image.memory(
                                    photo['bytes'],
                                    fit: BoxFit.cover,
                                    gaplessPlayback: true,
                                  )
                                : Container(
                                    color: colors.surfaceGlass,
                                    child: Icon(Icons.image, color: colors.textMuted),
                                  ),
                            Positioned(
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: 60,
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.bottomCenter,
                                    end: Alignment.topCenter,
                                    colors: [
                                      colors.background.withOpacity(0.8),
                                      Colors.transparent,
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            Positioned(
                              bottom: 8,
                              left: 8,
                              right: 8,
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  // Badge
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: colors.background.withOpacity(
                                        0.75,
                                      ),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          photo['icon'] as IconData,
                                          size: 10,
                                          color: photo['iconColor'] as Color,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          photo['type'] == 'BG Silindi' ? l.galleryTypeBgRemoved : 
                                          photo['type'] == 'AI Enhanced' ? l.editorLabelAiEnhanced :
                                          photo['type'] == '2× Upscale' ? l.editorLabelUpscale : photo['type'] as String,
                                          style: TextStyle(
                                            color: colors.textPrimary,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (photo['starred'] == true)
                                    Icon(
                                      Icons.star_rounded,
                                      color: colors.accentGold,
                                      size: 14,
                                    )
                                  else
                                    const SizedBox.shrink(),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}
