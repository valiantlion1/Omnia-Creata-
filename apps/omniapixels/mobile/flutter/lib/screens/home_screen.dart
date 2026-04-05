import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import 'gallery_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  final _tabs = const [
    GalleryScreen(),
    _ToolsTab(),
    _ProfileTab(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _tabs[_tab],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        backgroundColor: const Color(0xFF0F0F14),
        indicatorColor: const Color(0xFF6C3CE1).withOpacity(0.2),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.photo_library_outlined), selectedIcon: Icon(Icons.photo_library), label: 'Galeri'),
          NavigationDestination(icon: Icon(Icons.auto_fix_high_outlined), selectedIcon: Icon(Icons.auto_fix_high), label: 'Araçlar'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}

class _ToolsTab extends StatelessWidget {
  const _ToolsTab();

  static const _tools = [
    {'title': 'Upscale', 'subtitle': '2x / 4x AI büyütme', 'icon': Icons.zoom_in, 'type': 'super_resolution', 'color': Color(0xFF6C3CE1)},
    {'title': 'Arkaplan Sil', 'subtitle': 'Tek tıkla temiz kesim', 'icon': Icons.auto_fix_high, 'type': 'background_removal', 'color': Color(0xFF2196F3)},
    {'title': 'Geliştir', 'subtitle': 'Otomatik iyileştirme', 'icon': Icons.tune, 'type': 'enhance', 'color': Color(0xFF4CAF50)},
    {'title': 'Akıllı Kırp', 'subtitle': 'AI destekli kırpma', 'icon': Icons.crop, 'type': 'crop', 'color': Color(0xFFFF9800)},
    {'title': 'Stil Transferi', 'subtitle': 'Sanatsal dönüşüm', 'icon': Icons.palette, 'type': 'style_transfer', 'color': Color(0xFFE91E63)},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AI Araçlar')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Galerinden bir fotoğraf seç veya kameradan çek',
              style: TextStyle(color: Colors.white54, fontSize: 13)),
          const SizedBox(height: 16),
          ..._tools.map((t) => _ToolCard(
            title: t['title'] as String,
            subtitle: t['subtitle'] as String,
            icon: t['icon'] as IconData,
            color: t['color'] as Color,
            onTap: () => Navigator.pushNamed(context, '/gallery'),
          )),
        ],
      ),
    );
  }
}

class _ToolCard extends StatelessWidget {
  final String title, subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ToolCard({required this.title, required this.subtitle, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 48, height: 48,
          decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
        subtitle: Text(subtitle, style: const TextStyle(color: Colors.white54, fontSize: 12)),
        trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: Colors.white38),
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Column(children: [
              CircleAvatar(
                radius: 40,
                backgroundColor: const Color(0xFF6C3CE1).withOpacity(0.2),
                child: const Icon(Icons.person, size: 40, color: Color(0xFF6C3CE1)),
              ),
              const SizedBox(height: 12),
              Text(auth.email ?? '', style: const TextStyle(color: Colors.white70, fontSize: 14)),
            ]),
          ),
          const SizedBox(height: 32),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.redAccent),
            title: const Text('Sign Out', style: TextStyle(color: Colors.redAccent)),
            onTap: () => auth.signOut(),
          ),
        ],
      ),
    );
  }
}
