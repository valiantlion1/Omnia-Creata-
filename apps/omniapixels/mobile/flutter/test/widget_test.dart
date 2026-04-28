// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;

import 'package:omniapixels/editor/diagnostics.dart';
import 'package:omniapixels/editor/edit_models.dart';
import 'package:omniapixels/editor/image_renderer.dart';
import 'package:omniapixels/editor/markup_models.dart';
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
    expect(find.text('Brush'), findsOneWidget);
    expect(find.text('Text'), findsOneWidget);
    expect(find.text('Sticker'), findsOneWidget);
    expect(find.byTooltip('Reset all'), findsOneWidget);

    await tester.tap(find.text('Crop'));
    await tester.pumpAndSettle();

    expect(find.text('Original'), findsOneWidget);
    expect(find.text('1:1'), findsOneWidget);
    expect(find.text('4:5'), findsOneWidget);
    expect(find.text('16:9'), findsOneWidget);
    expect(find.text('Reset crop'), findsOneWidget);

    await tester.tap(find.text('Brush'));
    await tester.pumpAndSettle();

    expect(find.text('Size'), findsOneWidget);
    expect(find.text('Clear'), findsOneWidget);

    await tester.tap(find.text('Text'));
    await tester.pumpAndSettle();

    expect(find.text('Omnia'), findsOneWidget);
    expect(find.text('Glow'), findsOneWidget);
    expect(find.text('Add'), findsOneWidget);
  });

  test('detail changes the live preview matrix', () {
    final base = const EditValues().previewMatrix;
    final detailed = const EditValues(detail: 0.9).previewMatrix;

    expect(detailed, isNot(base));
    expect(detailed.first, greaterThan(base.first));
  });

  testWidgets('OmniaPixels exposes upscale modes', (WidgetTester tester) async {
    await tester.pumpWidget(const OmniaPixelsApp());

    await tester.tap(find.text('Continue without access'));
    await tester.pump();
    await tester.tap(find.text('Upscale').last);
    await tester.pumpAndSettle();

    expect(find.text('Fast 2x'), findsOneWidget);
    expect(find.text('Enhanced 2x'), findsOneWidget);
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
            uiBuildLabel: '0.3.6+14',
            apkBuildLabel: '0.3.6+14',
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

    await tester.drag(find.byType(ListView).first, const Offset(0, -700));
    await tester.pumpAndSettle();

    expect(find.text('Diagnostics'), findsOneWidget);
    expect(find.text('Avg frame'), findsOneWidget);
    expect(find.text('Recent operations'), findsOneWidget);
    expect(find.text('No operations measured yet'), findsOneWidget);
    expect(find.text('Build check'), findsOneWidget);
    expect(find.text('Neural model'), findsNothing);
  });

  test('upscale render keeps the long edge capped', () async {
    final source = img.Image(width: 120, height: 80);
    img.fill(source, color: img.ColorRgb8(24, 36, 48));

    final result = await renderEditedImage(
      bytes: img.encodeJpg(source),
      edit: const EditValues(),
      upscale: true,
      maxLongEdge: 100,
    );
    final decoded = img.decodeImage(result);
    expect(decoded, isNotNull);
    expect(
      decoded!.width > decoded.height ? decoded.width : decoded.height,
      100,
    );
  });

  test('render bakes brush and text markup layers', () async {
    final source = img.Image(width: 160, height: 120);
    img.fill(source, color: img.ColorRgb8(24, 36, 48));
    final bytes = img.encodeJpg(source);

    final plain = await renderEditedImage(
      bytes: bytes,
      edit: const EditValues(),
      maxLongEdge: 160,
    );
    final marked = await renderEditedImage(
      bytes: bytes,
      edit: const EditValues(),
      markups: const [
        MarkupLayer.brush(
          points: [MarkupPoint(x: 0.2, y: 0.2), MarkupPoint(x: 0.8, y: 0.8)],
          colorValue: 0xFFFFFFFF,
          size: 0.04,
        ),
        MarkupLayer.text(
          text: 'Omnia',
          x: 0.5,
          y: 0.45,
          colorValue: 0xFF5EEAD4,
          size: 0.12,
        ),
      ],
      maxLongEdge: 160,
    );

    expect(marked, isNot(plain));
    expect(img.decodeImage(marked), isNotNull);
  });
}
