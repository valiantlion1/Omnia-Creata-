# STATE_COVERAGE.md - Required Screen States

## Purpose
Ensure OmniaOrganizer never ships blank, confusing, or fake-feeling screens.

## Global rules
- every major screen needs loading, empty, and error thinking
- permission-dependent screens must define limited and denied states
- operation-heavy screens need partial-success handling

## Home
Required states:
- normal
- loading shell
- empty recent/new section
- no accessible sources yet

## Browse
Required states:
- loading folder
- empty folder
- permission expired
- source unavailable
- unsupported action on current source

## Search
Required states:
- no query yet
- loading results
- no results
- source unavailable
- index stale or unavailable

## Storage
Required states:
- loading summary
- insufficient data yet
- no analyzable content
- limited-access explanation

## Recycle Bin
Required states:
- normal with items
- empty recycle bin
- restore conflict
- permanent-delete confirmation

## Settings
Required states:
- normal
- limited permissions
- source disconnected
- partial capability explanation

## Cleanup and Smart Views
Required states:
- no suggestions
- loading suggestions
- suggestions unavailable due to limited access
- partial cleanup action success

## File detail / preview
Required states:
- supported preview
- unsupported preview
- file missing
- file changed externally

## Operation feedback
Required states:
- success
- partial success
- failure
- retry available where meaningful

## UX rules
- no blank white screens
- no endless spinner without context
- no destructive outcome without clear state transition
