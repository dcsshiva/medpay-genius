
## Fix: Show Staff Name Instead of Email in Team Chat

### Problem
When sending a message, the chat stores `user.user_metadata?.full_name || user.email` as the sender name. For some users (particularly admins logged in via Supabase auth), `full_name` may not be set in metadata, causing the email address to appear instead of the name.

### Fix (TeamChat.tsx)

Update the `sendMessage` function to resolve the sender's full name by looking up the `staff` table when `full_name` is not available in user metadata.

**Current code (line 83):**
```
sender_name: user.user_metadata?.full_name || user.email || 'Unknown',
```

**New approach:**
1. Before inserting, query the `staff` table for the user's `full_name` using `getStaffId` to find their record
2. Use this resolved name, falling back to metadata then email

```typescript
// Resolve sender name from staff table if not in metadata
let senderName = user.user_metadata?.full_name;
if (!senderName) {
  const { data: staffData } = await supabase
    .from('staff')
    .select('full_name')
    .eq('user_id', user.id)
    .maybeSingle();
  senderName = staffData?.full_name || user.email || 'Unknown';
}
```

### Existing Messages
Already-stored messages with email as the name won't change automatically. This fix only affects new messages going forward.

### File to Modify

| File | Change |
|------|--------|
| `src/components/ComplaintManagement.tsx` | No change |
| `src/components/TeamChat.tsx` | Resolve sender name from staff table before sending |
