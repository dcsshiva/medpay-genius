

# Update Help Guide & Chatbot Memory with All Features

## Scope

Two areas to update:

### 1. Help Guide — Comprehensive Feature Documentation

**Both `UserGuide.tsx` (authenticated) and `PublicUserGuide.tsx` (public)** currently have sparse feature descriptions. Need to expand with all modules, brief explanations, and practical examples.

#### PublicUserGuide.tsx — Expand `keyFeatures` array

Add missing features and enhance existing ones with examples:

| Feature | Brief Description + Example |
|---|---|
| Visit Management | Record patient visits with codes, payment type. *Example: "Dr. Kumar records a visit for Ramesh Babu — Rs.500, cash, regular checkup"* |
| Cash/Insurance Payments | Create payment periods, multi-stage approval. *Example: "Manager creates Apr 1-15 period, reviews 45 visits totalling Rs.22,500"* |
| Bank Advice (Beta) | Generate GEFU bank transfer files. *Example: "Select approved payments → Generate NEFT file → Download for bank upload"* |
| Quick Payment | Fast vendor/misc payments with bulk staff option. *Example: "Pay vendor ABC Supplies Rs.15,000 for medical equipment"* |
| Task Management | Assign tasks with priority, due dates, activity timeline. Verification workflow: staff marks complete → admin/manager verifies. *Example: "Assign 'Update patient records' to nurse, due Friday, high priority"* |
| Team Chat | Real-time messaging with edit/delete, date separators, search, multiline input. Admins can moderate. *Example: "Send message to team, edit a typo, search old messages"* |
| Complaint Management | Raise/track complaints with activity log showing all status changes. *Example: "Receptionist raises 'AC not working in OPD' → Manager resolves"* |
| Leave & Permission | Apply for leave/permission, approval workflow. *Example: "Apply for 2-day casual leave → Manager approves/rejects"* |
| Staff Appraisals | Performance rating system with criteria-based scoring. |
| Doctor Hub | Centralized doctor dashboard — payment summaries, visit history, profile. |
| TDS Reports | Generate TDS certificates and reports per financial year. |
| Reports & Exports | Doctor payment history, login reports, navigation analytics — all exportable to Excel. |
| Notifications | Real-time in-app notifications for task/complaint status changes. Bell icon with unread count. |
| AI Assistant | Floating chatbot for help — supports Tamil voice input, clickable navigation links. |
| Staff Management | Add/edit staff, Excel bulk import, role assignment. |
| Doctor Management | Manage doctor profiles, bank details, specializations. |
| Masters | Configure departments, roles, insurance companies, vendors, visit reasons, etc. |

Also update role descriptions to mention new capabilities (e.g., staff can edit/delete own chat messages, view activity logs on tasks).

Update the PDF generation section to include these expanded features.

#### UserGuide.tsx — Add feature sections for manager and staff roles

Currently only admin and doctor roles have detailed sections. Add:
- **Manager section**: Task creation with verification workflow, payment approval, leave approvals, team chat moderation
- **Staff section**: Task updates with activity timeline, complaint filing with status tracking, team chat features, leave/permission application
- **Common section**: Notification center, AI chatbot usage

### 2. Chatbot System Prompt — Update with New Features

**`supabase/functions/chatbot/index.ts`** — Enhance the `STATIC_SYSTEM_PROMPT`:

Add to Staff Features section:
- Task Management now has activity timeline showing all status changes with timestamps and actors
- Task verification workflow: staff marks complete → awaiting verification → admin/manager verifies
- Overdue auto-detection with visual indicators
- Complaint Management has activity logs showing status history
- In-app notifications for task and complaint status changes

Add to Team Chat section:
- Edit/delete own messages (hover for action icons)
- Admin/Manager can delete any message (moderation)
- Date separators between message groups
- Client-side message search
- Multiline input (Shift+Enter for new line)
- Online presence indicator
- Scroll-to-bottom button with unread count

Add to Notifications section (new):
- Real-time in-app notifications via bell icon
- Auto-notified on task status changes and complaint updates
- Notification preferences configurable

## Files to Edit

| File | Change |
|---|---|
| `src/pages/PublicUserGuide.tsx` | Expand keyFeatures array with all features + examples, update role descriptions, update PDF generation |
| `src/pages/UserGuide.tsx` | Add manager/staff feature sections, add common features (notifications, AI assistant, team chat) |
| `supabase/functions/chatbot/index.ts` | Update system prompt with new features: activity timelines, task verification, chat enhancements, notifications |

