

## Add AI Chatbot for WestMed Hospital

### Overview
Add a floating AI chatbot assistant that answers questions specifically about the WestMed Hospital Management System. It will use Lovable AI (Gemini) with a detailed system prompt containing project knowledge, and a self-learning feedback mechanism where admins can add/edit Q&A pairs that get injected into the AI context.

### How It Works

1. **Floating chat button** appears on all pages (bottom-right corner) for all authenticated users
2. Clicking it opens a chat panel where users can ask questions about the system
3. The AI responds only about WestMed HMS features -- payments, visits, doctors, staff, reports, etc.
4. **Self-learning**: Admins can manage a "Knowledge Base" of custom Q&A pairs stored in the database. These are fed into the AI's system prompt so it learns project-specific answers over time.

### Changes

#### 1. Database -- New `chatbot_knowledge_base` table
- Stores custom Q&A entries that admins add to teach the chatbot
- Columns: `id`, `question`, `answer`, `category`, `is_active`, `created_by`, `created_at`, `updated_at`
- RLS: Admins can manage, all authenticated users can read active entries

#### 2. Database -- New `chatbot_conversations` table (optional, for history)
- Stores chat history per user for continuity
- Columns: `id`, `user_id`, `messages` (jsonb), `created_at`, `updated_at`
- RLS: Users can only access their own conversations

#### 3. Edge Function -- `supabase/functions/chatbot/index.ts`
- Receives user messages + conversation history
- Fetches active knowledge base entries from `chatbot_knowledge_base`
- Builds a system prompt that:
  - Describes WestMed HMS and all its modules (payments, visits, doctors, staff, bank advice, TDS, complaints, leave, etc.)
  - Includes the custom Q&A knowledge base entries
  - Strictly instructs the AI to only answer about this project
- Calls Lovable AI Gateway with streaming enabled
- Returns SSE stream to client

#### 4. Frontend -- `src/components/AIChatbot.tsx`
- Floating button (Bot icon) in bottom-right corner
- Expandable chat panel with message history
- Streaming response rendering with markdown support
- Role-aware greetings (shows relevant help based on user role)
- Mobile-responsive design

#### 5. Frontend -- `src/components/ChatbotKnowledgeBase.tsx`
- Admin-only management page for adding/editing/deleting knowledge base entries
- Accessible from Settings or as a new navigation item for admins
- CRUD interface for Q&A pairs with categories

#### 6. Navigation & Layout Updates
- Add `AIChatbot` floating component to `Layout.tsx` (visible on all pages)
- Add "AI Knowledge Base" navigation item for admin/super_admin users
- Register the knowledge base view in `Index.tsx`

#### 7. Config Updates
- Add `[functions.chatbot]` with `verify_jwt = false` to `supabase/config.toml`

### Technical Details

**System Prompt Strategy:**
The edge function dynamically builds the system prompt by combining:
- A static description of all WestMed HMS modules and features
- Dynamic Q&A pairs from the `chatbot_knowledge_base` table
- A strict instruction to refuse any questions not related to the project

**Streaming Implementation:**
Uses the SSE streaming pattern from Lovable AI documentation -- the edge function streams the AI response, and the React component renders tokens as they arrive.

**Self-Learning Flow:**
1. Admin notices the chatbot gives an incomplete/wrong answer
2. Admin goes to "AI Knowledge Base" in settings
3. Adds a new Q&A entry (e.g., Q: "How do I generate bank advice?" A: "Go to Bank Advice Beta, select pending payments...")
4. Next time any user asks a similar question, the AI has this knowledge in its context

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/chatbot/index.ts` | AI edge function with streaming |
| `src/components/AIChatbot.tsx` | Floating chatbot UI component |
| `src/components/ChatbotKnowledgeBase.tsx` | Admin knowledge base manager |
| `supabase/migrations/xxx_chatbot_tables.sql` | Database tables |

### Files to Modify
| File | Change |
|------|--------|
| `supabase/config.toml` | Add chatbot function config |
| `src/components/Layout.tsx` | Add floating AIChatbot component |
| `src/pages/Index.tsx` | Add knowledge base view route |
| `src/lib/navigationItems.ts` | Add knowledge base nav item for admins |
| `src/integrations/supabase/types.ts` | Add new table types |
