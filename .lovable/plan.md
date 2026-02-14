

## AI Chatbot Enhancement: Voice Input, Navigation & Self-Learning

### What Already Exists
- Floating AI chatbot with streaming responses
- Clickable `[[Menu Name]]` navigation links (already working with `nav://` protocol)
- Admin knowledge base management (CRUD for Q&A pairs)
- Project-scoped system prompt (only answers about WestMed HMS)

### What Will Be Added

---

### 1. Voice Input with Tamil Support (ta-IN)

Add a microphone button next to the Send button using the browser's native Web Speech API (no external dependencies needed).

**New file: `src/hooks/useVoiceInput.tsx`**
- Custom hook wrapping `window.SpeechRecognition` / `webkitSpeechRecognition`
- Configured for Tamil (`ta-IN`) language
- Real-time transcript updates via `onresult`
- Auto-stop after silence timeout (~3 seconds via the API's built-in behavior)
- Error handling for unsupported browsers, permission denied, etc.
- Returns: `{ isListening, transcript, startListening, stopListening, isSupported }`

**Update: `src/components/AIChatbot.tsx`**
- Add a Mic/MicOff button between the textarea and Send button
- While listening: show a pulsing red indicator and "Listening..." label
- Transcript auto-fills the textarea in real-time
- On stop, the final text stays in the input for the user to review/edit before sending

---

### 2. Enhanced In-App Navigation (Already Mostly Done)

The existing `[[Menu Name]]` system and `nav://` protocol with `urlTransform` already handles in-app navigation. Minor improvements:

**Update: `src/components/AIChatbot.tsx`**
- Also detect bare markdown links like `[label](/some-path)` and route-like text `/dashboard`, converting them to in-app nav buttons where applicable
- Ensure no `target="_blank"` is ever used for internal links

---

### 3. Controlled Self-Learning Enhancement

Expand the existing knowledge base system with usage tracking and admin moderation.

**Database migration:**
- Add `chatbot_interactions` table:
  - `id`, `user_id`, `question`, `ai_response`, `feedback_rating` (nullable integer 1-5), `created_at`
  - RLS: users insert their own, admins can read all
- Add `usage_count` column to `chatbot_knowledge_base` to track how often entries are matched

**Update: `src/components/AIChatbot.tsx`**
- After each AI response, show small thumbs-up/thumbs-down feedback buttons
- Log the question + response + feedback to `chatbot_interactions`

**Update: `src/components/ChatbotKnowledgeBase.tsx`**
- Add a "Frequent Questions" tab showing aggregated questions from `chatbot_interactions`
- Admin can review frequent questions and promote them to knowledge base entries with one click
- Show feedback stats (positive/negative ratio) per interaction

**Update: `supabase/functions/chatbot/index.ts`**
- No changes needed -- the system prompt already dynamically loads knowledge base entries

---

### Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useVoiceInput.tsx` | Create | Reusable voice input hook with Tamil support |
| `src/components/AIChatbot.tsx` | Modify | Add mic button, listening UI, feedback buttons, interaction logging |
| `src/components/ChatbotKnowledgeBase.tsx` | Modify | Add "Frequent Questions" tab with admin promotion |
| `supabase/migrations/xxx_chatbot_interactions.sql` | Create | New `chatbot_interactions` table + `usage_count` column |

### Technical Notes

- **Web Speech API** is supported in Chrome, Edge, Safari, and most mobile browsers. Firefox has limited support. The hook will gracefully degrade with an "unsupported browser" message.
- **Tamil recognition** uses `lang: 'ta-IN'` on the `SpeechRecognition` instance. Users can speak in Tamil and the transcribed text is sent to the AI.
- **No external dependencies** are needed for voice input -- it uses the browser's built-in API.
- **Feedback logging** only stores data when the user explicitly clicks a feedback button, keeping it lightweight.
- The **self-learning is fully admin-controlled**: interactions are logged, but nothing enters the knowledge base without admin review and approval.

