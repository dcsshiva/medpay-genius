

## Add Mobile Number to Doctor Search

### Overview
Add mobile number to the search filter in Doctor Management so users can search doctors by their mobile number in addition to name, code, and specialization.

### Changes (Single File: `src/components/DoctorManagement.tsx`)

#### 1. Update search placeholder text (line 1178)
- Change from: "Search by doctor name, code, or specialization..."
- Change to: "Search by doctor name, code, specialization, or mobile number..."

#### 2. Add mobile number to display filter (line 1204-1208)
- Add `doctor.mobile_number?.toLowerCase().includes(searchLower)` to the filter condition

#### 3. Add mobile number to export filter (line 803-805)
- Add the same `mobile_number` check to the export filter logic to keep both in sync

### Technical Details
Three small edits in the same file, adding `mobile_number` to both filter blocks and updating the placeholder text.

