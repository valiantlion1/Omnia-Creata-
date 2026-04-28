# OmniaPixels Editor Market Research

Date: 2026-04-27

## Goal

Use successful photo editors as product references without cloning their UI. OmniaPixels stays photo-first, local-first, Android-ready, and honest about what runs on-device.

## Reference takeaways

### Adobe Lightroom mobile

Official Lightroom mobile docs group the edit surface around panels such as Actions, Presets, Crop, Edit, Masking, and Remove, with strong slider-based light/color/detail control and hold-to-compare style behavior.

OmniaPixels takeaway:

- Keep the photo as the main surface.
- Keep controls grouped by job: crop, light, color, detail, effects, local tools.
- Presets are fast entry points, not a replacement for manual control.
- Advanced AI/remove/masking should wait until the runtime is real and proven.

Source: https://helpx.adobe.com/lightroom-cc/using/edit-photos-mobile-ios.html

### Snapseed

Snapseed's official tool list includes Tune Image, Details, Crop, Rotate, Perspective, White Balance, Brush, Selective, Healing, Vignette, and Text.

OmniaPixels takeaway:

- A serious mobile editor needs direct-manipulation tools, not only global sliders.
- Brush, text, and local edit concepts should be accessible from the same compact tool rail.
- Undo/redo and export need to preserve the visible result.

Source: https://support.google.com/snapseed/answer/6183571?hl=en

### Picsart

Picsart positions itself around expressive creation: photo editing, stickers, collage, drawing, text, GIFs, templates, and creator-friendly remix flows. Its drawing docs emphasize brushes, size/opacity settings, undo/redo, and export; its text docs emphasize easy placement, styling, fonts, and customization.

OmniaPixels takeaway:

- Creator-grade editing needs visible creative layers: brush, text, and sticker-like elements.
- Layer tools should be quick and tactile, but export must bake the final visual result.
- GIF, sticker library, object cutout, and deeper text styling are later product lanes, not fake placeholders.

Sources:

- https://picsart.com/apps/picsart-photo-studio/
- https://picsart.com/draw/
- https://picsart.com/text-editor/

### Photoshop Express

Photoshop Express Android docs keep the starting path simple: open the editor, select a photo, then apply focused editing options, including crop/social ratios and generative features where available.

OmniaPixels takeaway:

- Entry path should remain obvious: pick photo, edit, export.
- Heavy or generative features must show clear progress and must not look like a mock spinner.
- Social-format crop/export presets are worth adding after manual crop quality improves.

Source: https://helpx.adobe.com/photoshop-express/get-started-android.html

### Android and Flutter platform guidance

Android's photo picker provides a system interface for selected media access and falls back through supported contracts on older devices. Flutter performance guidance emphasizes controlling build cost, splitting large widgets, avoiding unnecessary expensive operations, and building large lists lazily.

OmniaPixels takeaway:

- Gallery access must keep leaning on system picker paths and safe fallbacks.
- Editor live feedback should stay paint/GPU-first where possible.
- Heavy render/export/upscale should remain explicit busy operations, not run while dragging.

Sources:

- https://developer.android.com/training/data-storage/shared/photo-picker
- https://docs.flutter.dev/perf/best-practices

## Implemented in 0.3.6+14

- Added first creator-layer slice: Brush, Text, and Sticker tools in the editor rail.
- Added live markup overlay on the preview using normalized image coordinates.
- Added undo/redo support for edit values and markup layers together.
- Added export/upscale bake path so visible brush/text/sticker layers are written into the saved JPEG.
- Kept GIF, full sticker library, object remove, AI masking, and manual transform handles as later lanes.

## Next product lanes

1. Manual crop handles and straighten.
2. Text layer drag/scale/rotate and font choices.
3. Brush opacity/eraser and selective local adjustments.
4. Sticker import/cutout and small local sticker library.
5. Object/healing tools only after a real local model/runtime path exists.
