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
    expect(
      find.text('Premium photo editor & upscaler.\n100% local. No cloud.'),
      findsOneWidget,
    );
    expect(find.text('Choose Photos'), findsOneWidget);
  });

  testWidgets('OmniaPixels enters the gallery surface', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const OmniaPixelsApp());

    await tester.tap(find.text('Open Gallery'));
    await tester.pump();

    expect(find.text('Today'), findsOneWidget);
    expect(find.text('Gallery'), findsWidgets);
    expect(find.text('Load Albums'), findsOneWidget);
  });

  testWidgets('OmniaPixels keeps editor tools hidden until a photo is loaded', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const OmniaPixelsApp());

    await tester.tap(find.text('Open Gallery'));
    await tester.pump();
    await tester.tap(find.text('Edit').last);
    await tester.pumpAndSettle();

    expect(find.text('Pick a photo first'), findsOneWidget);
    expect(find.text('Pick Photo'), findsOneWidget);
    expect(find.text('Clean'), findsNothing);
    expect(find.text('Brush'), findsNothing);
  });

  testWidgets('OmniaPixels exposes premium editor controls with a photo', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final source = img.Image(width: 640, height: 420);
    img.fill(source, color: img.ColorRgb8(24, 36, 48));
    final bytes = img.encodeJpg(source);
    var edit = const EditValues();
    var tool = EditorTool.light;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) {
              return Builder(
                builder: (context) => EditorScreen(
                  bytes: bytes,
                  cropBaseBytes: bytes,
                  originalBytes: bytes,
                  edit: edit,
                  markups: const [],
                  draftMarkup: null,
                  tool: tool,
                  status: 'Ready',
                  isBusy: false,
                  canUndo: false,
                  canRedo: false,
                  canResetAll: false,
                  showOriginal: false,
                  markupColorValue: 0xFFFFFFFF,
                  brushSize: 0.026,
                  textTemplate: 'Omnia',
                  stickerTemplate: 'WOW',
                  onLiveEditChanged: (value) => setState(() => edit = value),
                  onCommittedEditChanged: (value) =>
                      setState(() => edit = value),
                  onCropFrameChanged: (value) => setState(() => edit = value),
                  onEditGestureStart: () {},
                  onEditGestureEnd: () {},
                  onUndo: () {},
                  onRedo: () {},
                  onResetAll: () {},
                  onPresetSelected: (_) {},
                  onResetTool: (_) {},
                  onMarkupColorChanged: (_) {},
                  onBrushSizeChanged: (_) {},
                  onTextTemplateChanged: (_) {},
                  onStickerTemplateChanged: (_) {},
                  onBrushStart: (_) {},
                  onBrushUpdate: (_) {},
                  onBrushEnd: () {},
                  onTextTap: (_) {},
                  onStickerTap: (_) {},
                  onAddCenteredText: () {},
                  onAddCenteredSticker: () {},
                  onCompareChanged: (_) {},
                  onToolSelected: (value) => setState(() => tool = value),
                  onOpenGallery: () {},
                  onPickSingle: () {},
                  onSave: () {},
                ),
              );
            },
          ),
        ),
      ),
    );

    expect(find.text('Brush'), findsOneWidget);
    expect(find.text('Text'), findsOneWidget);
    expect(find.text('Sticker'), findsOneWidget);
    expect(find.byTooltip('Reset all'), findsOneWidget);

    await tester.tap(find.text('Crop'));
    await tester.pump(const Duration(milliseconds: 250));

    expect(find.text('Original'), findsOneWidget);
    expect(find.text('Free'), findsOneWidget);
    expect(find.text('1:1'), findsOneWidget);
    expect(find.text('4:5'), findsOneWidget);
    expect(find.text('9:16'), findsOneWidget);
    expect(find.text('4:3'), findsOneWidget);
    expect(find.text('16:9'), findsOneWidget);
    expect(find.text('Reset crop'), findsOneWidget);

    await tester.tap(find.text('1:1'));
    await tester.pump(const Duration(milliseconds: 250));

    expect(find.text('Flip'), findsOneWidget);
    expect(find.text('Left'), findsOneWidget);
    expect(find.text('Right'), findsOneWidget);
    expect(find.text('Horizontal'), findsNothing);
    expect(find.text('Vertical'), findsNothing);

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

    await tester.tap(find.text('Open Gallery'));
    await tester.pump();
    await tester.tap(find.text('Upscale').last);
    await tester.pumpAndSettle();

    expect(find.text('Run Upscale'), findsOneWidget);
    expect(find.text('Original is never overwritten.'), findsOneWidget);
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
            uiBuildLabel: '0.3.13+21',
            apkBuildLabel: '0.3.13+21',
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

  test('render uses crop position when baking fixed aspect exports', () async {
    final source = img.Image(width: 120, height: 60);
    for (var y = 0; y < source.height; y++) {
      for (var x = 0; x < source.width; x++) {
        if (x < source.width / 2) {
          source.setPixelRgb(x, y, 230, 24, 24);
        } else {
          source.setPixelRgb(x, y, 24, 48, 230);
        }
      }
    }
    final bytes = img.encodeJpg(source, quality: 100);

    final left = img.decodeImage(
      await renderEditedImage(
        bytes: bytes,
        edit: const EditValues(cropMode: CropMode.square, cropX: 0),
        maxLongEdge: 120,
      ),
    );
    final right = img.decodeImage(
      await renderEditedImage(
        bytes: bytes,
        edit: const EditValues(cropMode: CropMode.square, cropX: 1),
        maxLongEdge: 120,
      ),
    );

    expect(left, isNotNull);
    expect(right, isNotNull);
    expect(left!.width, left.height);
    expect(right!.width, right.height);

    final leftPixel = left.getPixel(left.width ~/ 2, left.height ~/ 2);
    final rightPixel = right.getPixel(right.width ~/ 2, right.height ~/ 2);
    expect(leftPixel.r, greaterThan(leftPixel.b));
    expect(rightPixel.b, greaterThan(rightPixel.r));
  });

  test('render bakes direct crop frames from the crop editor', () async {
    final source = img.Image(width: 120, height: 60);
    for (var y = 0; y < source.height; y++) {
      for (var x = 0; x < source.width; x++) {
        if (x < source.width / 2) {
          source.setPixelRgb(x, y, 230, 24, 24);
        } else {
          source.setPixelRgb(x, y, 24, 48, 230);
        }
      }
    }

    final cropped = img.decodeImage(
      await renderEditedImage(
        bytes: img.encodeJpg(source, quality: 100),
        edit: const EditValues(cropLeft: 0.5, cropWidth: 0.5),
        maxLongEdge: 120,
      ),
    );

    expect(cropped, isNotNull);
    expect(cropped!.width, 60);
    expect(cropped.height, 60);
    final pixel = cropped.getPixel(cropped.width ~/ 2, cropped.height ~/ 2);
    expect(pixel.b, greaterThan(pixel.r));
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
