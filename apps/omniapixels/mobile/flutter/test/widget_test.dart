// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

import 'package:omniapixels/editor/diagnostics.dart';
import 'package:omniapixels/main.dart';

void main() {
  testWidgets('OmniaPixels boots into branded splash', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const OmniaPixelsApp());

    expect(find.text('OmniaPixels'), findsOneWidget);
    expect(find.text('Photo editor & upscaler'), findsOneWidget);
    expect(find.text('Choose Photos'), findsOneWidget);
  });

  testWidgets('OmniaPixels enters the gallery surface', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const OmniaPixelsApp());

    await tester.tap(find.text('Continue without access'));
    await tester.pump();

    expect(find.text('Recent'), findsOneWidget);
    expect(find.text('Gallery'), findsOneWidget);
    expect(find.text('Load Albums'), findsOneWidget);
  });

  testWidgets('OmniaPixels exposes premium editor controls', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const OmniaPixelsApp());

    await tester.tap(find.text('Continue without access'));
    await tester.pump();
    await tester.tap(find.text('Edit').last);
    await tester.pumpAndSettle();

    expect(find.text('Clean'), findsOneWidget);
    expect(find.text('Pop'), findsOneWidget);
    expect(find.text('Cinematic'), findsOneWidget);

    await tester.tap(find.text('Crop'));
    await tester.pumpAndSettle();

    expect(find.text('Original'), findsOneWidget);
    expect(find.text('1:1'), findsOneWidget);
    expect(find.text('4:5'), findsOneWidget);
    expect(find.text('16:9'), findsOneWidget);
    expect(find.text('Reset crop'), findsOneWidget);
  });

  testWidgets('OmniaPixels exposes upscale modes', (WidgetTester tester) async {
    await tester.pumpWidget(const OmniaPixelsApp());

    await tester.tap(find.text('Continue without access'));
    await tester.pump();
    await tester.tap(find.text('Upscale').last);
    await tester.pumpAndSettle();

    expect(find.text('Fast'), findsOneWidget);
    expect(find.text('AI Experimental'), findsOneWidget);
  });

  testWidgets('OmniaPixels exposes diagnostics in settings', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SettingsScreen(
            status: 'Ready',
            assetCount: 0,
            totalAssetCount: 0,
            loadedPages: 0,
            thumbnailCacheCount: 0,
            uiBuildLabel: '0.3.3+11',
            apkBuildLabel: '0.3.3+11',
            buildCheckLabel: 'Match',
            hasSelection: false,
            diagnostics: const [],
            frameSnapshot: FrameDiagnosticsSnapshot.empty,
            latestError: null,
            onClearDiagnostics: () {},
          ),
        ),
      ),
    );

    await tester.scrollUntilVisible(
      find.text('Diagnostics'),
      320,
      scrollable: find.byType(Scrollable),
    );

    expect(find.text('Diagnostics'), findsOneWidget);
    expect(find.text('Avg frame'), findsOneWidget);
    expect(find.text('Recent operations'), findsOneWidget);
    expect(find.text('No operations measured yet'), findsOneWidget);
    expect(find.text('Build check'), findsOneWidget);
  });
}
