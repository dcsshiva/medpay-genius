

## Ensure All Roles Route to Respective Dashboards on Login

### Problem Summary

The current login flow has inconsistencies where users with different roles (Admin, Manager, Doctor, Staff/Nurse) are not always routed to their appropriate dashboards. The role determination and routing logic is fragmented across multiple files.

### Current Role-to-Dashboard Mapping

| Role | Current Behavior | Expected Behavior |
|------|------------------|-------------------|
| **Admin** | Routes to Doctor Hub | Routes to Doctor Hub (correct) |
| **Manager** | Routes to Doctor Hub | Routes to Doctor Hub (correct) |
| **Doctor** | Routes to `/dashboard?view=doctor` | Routes to Doctor Hub (correct) |
| **Staff/Nurse** | Falls through to generic Dashboard | Routes to Staff Mobile Dashboard on mobile, Dashboard on desktop |

### Data Source Analysis

Roles are determined from two sources:
1. **`staff.role`**: Contains values like `admin`, `manager`, `nurse`
2. **`user_designations.designation`**: Contains `admin`, `manager`, `doctor`, `staff`

Some users have mismatches between these two tables, requiring both to be checked.

---

### Implementation Plan

#### 1. Fix Auth.tsx - Post-Login Navigation

**File: `src/pages/Auth.tsx`**

Update the `handleVerifyOTP` function to properly route users after login:

```text
┌─────────────────────────────────────────────────────────────┐
│ After OTP Verification - Determine Route                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Check if user is a Doctor                               │
│     └── Route: /dashboard?view=doctor-hub                   │
│                                                             │
│  2. Check if user is Admin/Manager (from staff.role OR      │
│     user_designations.designation)                          │
│     └── Route: /dashboard?view=doctor-hub                   │
│                                                             │
│  3. Check if user is Staff/Nurse                            │
│     └── Route: /dashboard?view=staff                        │
│                                                             │
│  4. Fallback (designation-only users)                       │
│     └── Route based on designation                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Changes:**
- Add explicit navigation after creating session record (currently missing for staff)
- Add `?view=staff` parameter for staff/nurse roles
- Remove redundant navigation in `useEffect` that conflicts with explicit routing

---

#### 2. Update Index.tsx - View Parameter Handling

**File: `src/pages/Index.tsx`**

Enhance the URL view parameter handling to include staff view:

```typescript
// Current (Lines 56-62)
if (view === 'doctor' || view === 'doctor-hub') {
  setActiveTab('doctor-hub');
} else if (view === 'admin' || view === 'manager' || view === 'staff') {
  setActiveTab('dashboard');
}

// Updated
if (view === 'doctor' || view === 'doctor-hub') {
  setActiveTab('doctor-hub');
} else if (view === 'staff') {
  setActiveTab('staff-dashboard');  // New tab for staff
} else if (view === 'admin' || view === 'manager') {
  setActiveTab('doctor-hub');
}
```

Add new case in `renderContent()` for staff dashboard:
```typescript
case 'staff-dashboard':
  return <StaffMobileDashboard onNavigate={handleTabChange} />;
```

---

#### 3. Improve Auto-Redirect Logic in Index.tsx

**File: `src/pages/Index.tsx`**

Update the auto-redirect `useEffect` to handle all roles consistently:

```typescript
useEffect(() => {
  if (loading || !userProfile) return;
  
  const role = userProfile.role || userProfile.designation;
  const userType = userProfile.user_type;
  
  // Doctor users -> Doctor Hub
  if (userType === 'doctor' || role === 'doctor') {
    setActiveTab('doctor-hub');
    return;
  }
  
  // Admin/Manager -> Doctor Hub
  if (['admin', 'manager', 'super_admin'].includes(role)) {
    setActiveTab('doctor-hub');
    return;
  }
  
  // Staff/Nurse on mobile -> Staff Dashboard
  if (['staff', 'nurse'].includes(role) && isMobile) {
    setActiveTab('staff-dashboard');
    return;
  }
  
  // Staff/Nurse on desktop -> Regular Dashboard
  // (default behavior, no redirect needed)
}, [userProfile, loading, activeTab, isMobile]);
```

---

#### 4. Update Auth.tsx Navigation Logic

**Changes in `handleVerifyOTP` function:**

```text
After session creation for staff:
┌─────────────────────────────────────────────────────────────┐
│ if (staffData.role === 'admin' || designation === 'admin')  │
│   └── navigate('/dashboard?view=doctor-hub')                │
│                                                             │
│ else if (staffData.role === 'manager' ||                    │
│          designation === 'manager')                          │
│   └── navigate('/dashboard?view=doctor-hub')                │
│                                                             │
│ else if (staffData.role === 'nurse' ||                      │
│          designation === 'staff')                            │
│   └── navigate('/dashboard?view=staff')                     │
│                                                             │
│ else                                                        │
│   └── navigate('/dashboard')                                │
└─────────────────────────────────────────────────────────────┘
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Fix post-login navigation to route all roles correctly |
| `src/pages/Index.tsx` | Add `staff-dashboard` tab handling, improve auto-redirect logic |

---

### Role-Based Dashboard Routing Summary

```text
┌──────────────────────────────────────────────────────────────────┐
│                    ROLE-BASED ROUTING FLOW                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Logs In                                                    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────┐                                             │
│  │ Check user type │                                             │
│  └────────┬────────┘                                             │
│           │                                                      │
│     ┌─────┴─────┬─────────────┬──────────────┐                   │
│     ▼           ▼             ▼              ▼                   │
│  Doctor     Admin/Manager   Staff/Nurse    Other                 │
│     │           │             │              │                   │
│     ▼           ▼             ▼              ▼                   │
│  Doctor Hub  Doctor Hub   Staff Dashboard   Dashboard            │
│  (filtered)  (full view)  (task/leave      (generic)            │
│              with all      focused)                              │
│              doctors                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### Technical Details

#### Role Determination Priority

1. **First check**: `staff.role` field (admin, manager, nurse)
2. **Second check**: `user_designations.designation` field (admin, manager, doctor, staff)
3. **Third check**: `doctors` table for doctor user_id linkage

#### Session Creation Already Stores Role

The `createSessionRecord` function already stores the role in the session, so the role is available via `userProfile.role` after login.

#### Mobile vs Desktop

- **Mobile Staff**: Show `StaffMobileDashboard` with quick actions
- **Desktop Staff**: Show standard `Dashboard` with admin-lite view

---

### Testing Checklist

After implementation, verify:

1. [ ] Admin (ADM430) logs in -> Routes to Doctor Hub
2. [ ] Manager (MGR100) logs in -> Routes to Doctor Hub  
3. [ ] Doctor logs in -> Routes to Doctor Hub (filtered to their data)
4. [ ] Nurse/Staff (NUR019) logs in -> Routes to Staff Dashboard (mobile) or Dashboard (desktop)
5. [ ] URL parameter `?view=staff` works correctly
6. [ ] URL parameter `?view=doctor-hub` works correctly
7. [ ] Session persists correct role after page refresh

