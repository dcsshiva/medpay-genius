# Task Management for Staff - Implementation Guide

## Overview
This document explains how task management works for all staff members in the hospital management system.

## Staff Roles Supported
All staff roles except admin, manager, and doctor can view and update their assigned tasks:
- `nurse`
- `technician` 
- `receptionist`
- `pharmacist`
- `cleaner`
- `security`

## Architecture

### Authentication Types Supported
The system supports both authentication methods:

1. **Custom Auth Users**: Have `user_metadata.user_type === 'staff'` and `user_metadata.original_id`
2. **Supabase Auth Users**: Have `user_metadata.role === 'staff'` and are linked via profiles table

### Database Structure
```sql
profiles (user_id, role) -> staff (profile_id, role) -> tasks (assigned_to)
```

### Key Components

#### 1. Utility Functions (`src/lib/staffUtils.ts`)
- `getStaffId(user)`: Gets staff ID for any auth type
- `isStaffRole(userRole)`: Checks if role is a staff role
- `getStaffTaskCounts(staffId)`: Gets task counts for dashboard
- `getStaffTasks(staffId)`: Gets full task data for task management

#### 2. Database Functions
- `get_staff_task_counts(_staff_id)`: Returns pending and completed task counts
- `get_staff_tasks(_staff_id)`: Returns full task details with staff info

#### 3. RLS Policies
Tasks table has policies that allow:
- **SELECT**: Staff can view their assigned tasks
- **UPDATE**: Staff can update their assigned tasks
- Excludes admin, manager, doctor roles from staff policies

### Components Updated

#### Dashboard (`src/components/Dashboard.tsx`)
- Shows task count cards for staff users
- Uses `getStaffTaskCounts()` for data
- Cards are clickable to navigate to task management

#### TaskManagement (`src/components/TaskManagement.tsx`)
- Shows full task list for staff users
- Uses `getStaffTasks()` to fetch data
- Allows status updates and notes

#### Navigation (Layout & AppSidebar)
- Shows "My Tasks" navigation for all staff roles
- Uses `isStaffRole()` for consistent role detection

## Testing Checklist

For any new staff member, verify:

1. **Dashboard Access**:
   - [ ] Shows "My Pending Tasks" and "Completed Tasks" cards
   - [ ] Cards show correct counts
   - [ ] Cards are clickable and navigate to tasks

2. **Navigation**:
   - [ ] "My Tasks" appears in sidebar
   - [ ] "My Tasks" appears in mobile navigation
   - [ ] Navigation is consistent across components

3. **Task Management**:
   - [ ] Can view assigned tasks
   - [ ] Can update task status (pending -> in_progress -> completed)
   - [ ] Can add notes to tasks
   - [ ] Cannot see tasks assigned to other staff

4. **Both Auth Types**:
   - [ ] Works for custom auth staff (legacy)
   - [ ] Works for Supabase auth staff (new)

## Database Verification Queries

```sql
-- Check staff record exists and is linked to profile
SELECT 
  p.user_id, p.role as profile_role,
  s.id as staff_id, s.username, s.role as staff_role, s.is_active
FROM profiles p
JOIN staff s ON s.profile_id = p.id
WHERE p.user_id = 'USER_ID_HERE';

-- Check tasks assigned to specific staff
SELECT t.*, s.username, s.role 
FROM tasks t 
JOIN staff s ON t.assigned_to = s.id 
WHERE s.id = 'STAFF_ID_HERE';

-- Test RPC functions
SELECT * FROM get_staff_task_counts('STAFF_ID_HERE');
SELECT * FROM get_staff_tasks('STAFF_ID_HERE');
```

## Future Staff Creation

When creating new staff through StaffManagement:
1. Profile is created automatically via trigger
2. Staff record is linked to profile via `profile_id`
3. Task management will work automatically for all supported roles
4. No additional configuration needed

## Troubleshooting

If task management doesn't work for a staff member:

1. Check if profile exists and is linked
2. Verify staff role is not admin/manager/doctor
3. Check if tasks are actually assigned to them
4. Test RPC functions directly
5. Check console logs for detailed debugging info

All utility functions include comprehensive logging for debugging.