# ACCESSIBILITY_LOCALIZATION.md - Accessibility and Localization Rules

## Purpose
Make OmniaOrganizer usable on real phones, not only in ideal screenshots.

## Accessibility rules
- touch targets should stay comfortably tappable
- icon-only actions must have accessible labels
- destructive actions need text clarity, not color alone
- contrast must remain readable in bright mobile conditions
- large text must not break critical flows
- selection state must be visible beyond color alone

## Screen reader expectations
- files should announce name, type, size, and key state where useful
- folders should announce name and item count where known
- action sheets and dialogs should announce purpose clearly
- confirmation dialogs must read the actual outcome

## Motion and cognition
- avoid motion that hides state changes
- keep loading feedback lightweight and understandable
- avoid dense settings walls

## Localization rules
- structure copy for translation from day one
- avoid fragile string concatenation
- file sizes, dates, and times must respect locale formatting
- truncation-sensitive labels should be tested in both Turkish and English

## Turkish and English copy guidance
- use short action labels
- prefer direct verbs
- avoid marketing-heavy metaphors
- keep error copy practical and calm

## Priority surfaces
- Browse
- Search
- delete confirmations
- permission education
- cleanup review
