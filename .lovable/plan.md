

# Enhance Team Chat Management

## Current State
- Basic chat with send/receive and real-time updates
- No edit/delete own messages, no date separators, no search, no multiline input, no message moderation
- DB supports: update own messages (RLS exists), but no DELETE policy
- Messages table: content, sender_id, sender_name, sender_role, is_edited, created_at, updated_at

## Plan

### 1. Database: Add DELETE policy for own messages + admin moderation
- Add RLS policy: users can delete their own messages (`sender_id = auth.uid()`)
- Add RLS policy: admins/managers can delete any message (moderation)

### 2. UI Enhancements (TeamChat.tsx)

**Message input upgrade:**
- Replace `Input` with `Textarea` (auto-resizing, max 4 lines) for multiline messages
- Shift+Enter for newline, Enter to send (already handled)

**Edit own messages:**
- Hover/long-press on own message shows Edit icon
- Inline edit mode: replace message bubble with textarea + Save/Cancel buttons
- Updates DB with `is_edited = true`, shows "(edited)" label (already rendered)

**Delete own messages:**
- Hover on own message shows Trash icon
- Confirmation dialog before delete
- Admin/Manager can delete any message (moderation)

**Date separators:**
- Group messages by date, insert "Today", "Yesterday", or formatted date dividers between groups

**Message search:**
- Add a search icon in the header that toggles a search bar
- Client-side filter on loaded messages (already loads 100)

**Online presence indicator:**
- Show count of unique senders from last 5 minutes in the header badge

**Scroll-to-bottom button:**
- Show a floating "scroll to bottom" button when user scrolls up, with unread count badge

### 3. Real-time: Subscribe to DELETE events
- Add `postgres_changes` listener for `DELETE` event on messages table to remove deleted messages from state

## Files Changed

| File | Change |
|------|--------|
| DB migration | Add DELETE RLS policies for messages table |
| `src/components/TeamChat.tsx` | Full enhancement: edit/delete, date separators, search, multiline input, scroll-to-bottom, moderation |

All existing logic (send, real-time INSERT/UPDATE, role colors, name resolution) preserved.

