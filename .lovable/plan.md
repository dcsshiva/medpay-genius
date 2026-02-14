

## Notify Admins When Staff Submit Complaints, Leave, or Permission Requests

### What Changes

Currently, notifications only go **to staff** (task assigned, leave approved/rejected). This change adds notifications **to admins/managers** when staff submit:
- Complaint submissions (notifies the admin/manager selected in `submitted_to`)
- Leave applications (notifies the selected approver)
- Permission applications (notifies the selected approver)

### Implementation

#### 1. Database Migration -- Two New Trigger Functions

**Trigger: `notify_complaint_submitted`**
- Fires on INSERT into `complaints` table
- Looks up the `submitted_to` staff record to get their `user_id`
- Looks up the `raised_by` staff name for the message
- Inserts a notification with type `complaint_submitted` for the admin/manager

**Trigger: `notify_leave_permission_submitted`**
- Fires on INSERT into `leave_permission_applications` table
- Looks up the `approver_id` staff record to get their `user_id`
- Looks up the applicant name for the message
- Inserts a notification with type `leave_submitted` or `permission_submitted`

#### 2. Update NotificationCenter.tsx

Add icon handling and navigation for the new notification types:
- `complaint_submitted` -- navigate to "complaints" tab, use an alert icon
- `leave_submitted` / `permission_submitted` -- navigate to "leave-approval" tab, use calendar/clock icons

### Technical Details

**New migration SQL:**

```sql
-- Notify admin/manager when complaint is submitted
CREATE OR REPLACE FUNCTION public.notify_complaint_submitted()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  raiser_name TEXT;
BEGIN
  IF NEW.submitted_to IS NOT NULL THEN
    SELECT user_id INTO target_user_id FROM public.staff WHERE id = NEW.submitted_to;
    SELECT full_name INTO raiser_name FROM public.staff WHERE id = NEW.raised_by;
    IF target_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, staff_id, title, message, type, related_entity_id, related_entity_type)
      VALUES (
        target_user_id, NEW.submitted_to,
        'New Complaint Received',
        COALESCE(raiser_name, 'A staff member') || ' raised a complaint: ' || NEW.complaint_title,
        'complaint_submitted', NEW.id, 'complaint'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_complaint_submitted
AFTER INSERT ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.notify_complaint_submitted();

-- Notify approver when leave/permission is submitted
CREATE OR REPLACE FUNCTION public.notify_leave_permission_submitted()
RETURNS TRIGGER AS $$
DECLARE
  approver_user_id UUID;
  applicant_name TEXT;
  app_type TEXT;
BEGIN
  SELECT user_id INTO approver_user_id FROM public.staff WHERE id = NEW.approver_id;
  SELECT full_name INTO applicant_name FROM public.staff WHERE id = NEW.applicant_id;
  app_type := CASE WHEN NEW.application_type::text = 'leave' THEN 'leave_submitted' ELSE 'permission_submitted' END;

  IF approver_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, staff_id, title, message, type, related_entity_id, related_entity_type)
    VALUES (
      approver_user_id, NEW.approver_id,
      'New ' || initcap(NEW.application_type::text) || ' Request',
      COALESCE(applicant_name, 'A staff member') || ' submitted a ' || NEW.application_type::text || ' request',
      app_type, NEW.id, 'leave_application'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_leave_permission_submitted
AFTER INSERT ON public.leave_permission_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_leave_permission_submitted();
```

**NotificationCenter.tsx changes:**
- Add icons for `complaint_submitted`, `leave_submitted`, `permission_submitted`
- Add navigation: `complaint_submitted` -> "complaints", `leave_submitted`/`permission_submitted` -> "leave-approval"

### Files to Modify

| File | Change |
|------|--------|
| New migration SQL | Add 2 trigger functions + 2 triggers |
| `src/components/NotificationCenter.tsx` | Add icons and navigation for new notification types |

