

## Hospital Staff Appraisal Criteria and Staff Dashboard Enhancement

### Part 1: Recommended Appraisal Criteria for Hospital Staff

Your current appraisal system tracks 5 rating categories (Punctuality, Work Quality, Teamwork, Communication, Professionalism). Here are **additional hospital-specific criteria** recommended to add:

**Clinical Performance (for clinical staff)**
- Patient Care Quality -- bedside manner, care accuracy, patient satisfaction
- Infection Control Compliance -- adherence to hygiene and safety protocols
- Medical Documentation Accuracy -- completeness of patient records
- Emergency Response Readiness -- ability to handle emergencies calmly

**Operational Performance (all staff)**
- Attendance and Reliability -- late arrivals, absences, shift coverage
- Task Completion Rate -- percentage of assigned tasks completed on time
- Equipment and Resource Handling -- proper use of hospital equipment
- Compliance with Hospital Policies -- dress code, ID badge, mobile usage

**Behavioral and Soft Skills**
- Patient/Visitor Interaction -- how well staff deals with patients and families
- Initiative and Problem Solving -- proactive improvements, suggestions
- Adaptability -- willingness to take on extra duties, shift swaps
- Ethical Conduct -- maintaining confidentiality, integrity

**Growth and Development**
- Training Participation -- attendance at in-service training, workshops
- Skill Development -- new skills acquired during the period
- Goal Achievement -- progress toward previously set goals

### Part 2: Enhance Staff Dashboard with Appraisal and Performance Data

Currently, the Staff Mobile Dashboard shows only: tasks (pending/completed), leave stats, and quick actions. Staff **cannot** see their own appraisals, warnings, or daily activity records from the dashboard, even though RLS policies already allow it.

---

### Database Changes

**Add new columns to `staff_appraisals` table** for the additional criteria:

| Column | Type | Purpose |
|--------|------|---------|
| patient_care_rating | integer (1-5) | Patient care quality score |
| infection_control_rating | integer (1-5) | Hygiene compliance score |
| documentation_rating | integer (1-5) | Record-keeping accuracy |
| attendance_reliability_rating | integer (1-5) | Attendance consistency |
| initiative_rating | integer (1-5) | Proactiveness score |
| training_participation_rating | integer (1-5) | Training engagement |
| appraisal_reason_id | uuid (FK) | Links to appraisal_reasons master table |
| staff_acknowledgement | boolean | Staff has read and acknowledged the appraisal |
| staff_comments | text | Staff's own feedback/response |
| acknowledged_at | timestamptz | When staff acknowledged |

All new columns are **nullable** so existing records are unaffected.

---

### UI Changes

#### 1. Staff Dashboard Enhancement (`StaffMobileDashboard.tsx`)

Add new sections to the existing dashboard:

**New Stats Cards (row 3):**
- Latest Appraisal Rating (e.g., "Good" with colored badge)
- Active Warnings count (with severity indicator)

**New Section: "My Performance"**
- Shows the most recent appraisal summary: period, overall rating, and a mini radar/bar chart of the individual ratings
- Tappable to see full appraisal details in a dialog/sheet

**New Section: "Recent Warnings"**
- Shows up to 3 most recent warnings with severity badges
- Only appears if the staff has any warnings

**New Quick Action:**
- "View My Appraisals" -- navigates to a detailed appraisal history view

#### 2. New Component: Staff Appraisal View (`StaffAppraisalView.tsx`)

A read-only view for staff to see their own appraisal history:
- List of all appraisals with date, period, and rating
- Expandable detail view showing all category ratings as visual bars
- Staff can add their own comments/response
- Staff can acknowledge ("I have read this appraisal") button
- Shows the action plan and areas for improvement

#### 3. Update Appraisal Form (`StaffAppraisalManagement.tsx`)

Add the new rating fields to the appraisal creation form:
- Patient Care Quality slider (1-5)
- Infection Control Compliance slider (1-5)
- Documentation Accuracy slider (1-5)
- Attendance Reliability slider (1-5)
- Initiative slider (1-5)
- Training Participation slider (1-5)
- Appraisal Reason dropdown (from `appraisal_reasons` master table)

Group sliders into categories with section headers for clarity.

---

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Migration SQL | Create | Add new columns to staff_appraisals |
| `src/components/StaffAppraisalView.tsx` | Create | Staff's read-only view of their appraisals, warnings, activities |
| `src/components/StaffMobileDashboard.tsx` | Modify | Add performance stats cards and "My Performance" section |
| `src/components/StaffAppraisalManagement.tsx` | Modify | Add new rating sliders and appraisal reason dropdown |

### What Does NOT Change
- All existing appraisal data remains intact (new columns are nullable)
- RLS policies already support staff viewing their own records
- Warning types and severity levels stay the same
- Admin/manager workflows are preserved
- Navigation and routing logic untouched

