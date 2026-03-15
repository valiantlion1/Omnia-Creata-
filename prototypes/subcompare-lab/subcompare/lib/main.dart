import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const ProviderScope(child: SubCompareApp()));
}

class SubCompareApp extends StatelessWidget {
  const SubCompareApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SubCompare',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
      debugShowCheckedModeBanner: false,
      locale: const Locale('tr'),
      supportedLocales: const [Locale('tr'), Locale('en')],
    );
  }
}
