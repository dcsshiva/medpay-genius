# Session Timeout System

## Overview
The session timeout system provides role-based idle session management with all data stored in Supabase database (no local storage).

## Timeout Durations

### Staff & Doctors
- **Idle Timeout**: 180 seconds (3 minutes)
- **Warning Time**: 120 seconds (2 minutes) - shows warning 60 seconds before timeout
- **Clear Data**: 10 seconds before timeout

### Admin & Manager
- **Idle Timeout**: 300 seconds (5 minutes) 
- **Warning Time**: 240 seconds (4 minutes) - shows warning 60 seconds before timeout
- **Clear Data**: 10 seconds before timeout

## Features

### 1. Activity Tracking
- All user interactions (mouse, keyboard, touch, scroll) reset the timeout
- Activity timestamps stored in `user_sessions` table in Supabase
- Session status checked every 5 seconds from database

### 2. Warning System
- Toast notification appears at warning time
- Users can extend session with "Extend Session" button
- Warning count tracked in database

### 3. Data Protection
- Unsaved form data cleared 10 seconds before timeout
- Components can use `useUnsavedChanges` hook to handle clearing
- Custom `clearUnsavedData` event dispatched for cleanup

### 4. Session Management
- Sessions stored entirely in Supabase `user_sessions` table
- Automatic cleanup of expired sessions
- No localStorage/sessionStorage for sensitive data

## Database Schema

```sql
-- user_sessions table includes:
- last_activity_at: timestamp of last user activity
- idle_timeout_seconds: role-based timeout duration
- warning_shown_at: when warning was displayed
- timeout_warnings_count: number of warnings shown
```

## Usage in Components

### Basic Usage
The `SessionTimeoutWrapper` component automatically handles timeouts for all authenticated users.

### Handling Unsaved Data
```typescript
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

const MyFormComponent = () => {
  const [formData, setFormData] = useState(initialData);
  
  const hasUnsavedChanges = /* check if form has changes */;
  
  useUnsavedChanges({
    hasUnsavedChanges,
    onClear: () => {
      // Clear form data
      setFormData(initialData);
      // Show notification
      toast({ 
        title: "Form Cleared",
        description: "Data cleared due to session timeout" 
      });
    }
  });
};
```

### Custom Clear Event Listener
```javascript
// Listen for session timeout clear events
window.addEventListener('clearUnsavedData', () => {
  // Clear any component-specific unsaved data
});
```

## Security Features

1. **Database-Only Storage**: All session data stored in Supabase
2. **Automatic Cleanup**: Expired sessions marked inactive
3. **Activity Validation**: Server-side session validation
4. **Role-Based Rules**: Different timeouts per user role

## Development Mode
In development, a timer display shows remaining session time in bottom-right corner.

## Session Extension
Users can extend their session when warned:
- Updates `last_activity_at` timestamp
- Resets warning state
- Continues normal timeout counting

## Automatic Logout
When session expires:
1. Clear any unsaved data
2. Show timeout notification
3. Sign out user
4. Redirect to login page
5. Mark session as inactive in database