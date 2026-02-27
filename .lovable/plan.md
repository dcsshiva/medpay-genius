

## Add Mobile Number Field to Doctor Management

### Overview
Add a mobile number field to the Doctor Management form (both create and edit) for OTP login purposes. The `mobile_number` column already exists in the `doctors` table, so no database changes are needed.

### Changes (Single File: `src/components/DoctorManagement.tsx`)

#### 1. Add `mobile_number` to form state and interface
- Add `mobile_number` to the `formData` state object and the `Doctor` interface
- Add `mobile_number` to `resetForm()`

#### 2. Add mobile number field to the form UI
- Place it after the Email field with label "Mobile Number (for OTP Login)"
- Input accepts only digits, max 10 characters using `formatMobileNumber` from validators
- Show inline validation error if not exactly 10 digits (when not empty)
- Import `validateMobileNumber` and `formatMobileNumber` from `@/lib/validators`

#### 3. Duplicate validation
- Add a `mobileError` state (like `emailError`)
- On mobile number change, debounce-check against existing doctors' `mobile_number` in the database
- Exclude the current doctor when editing
- Show error message: "This mobile number is already registered to another doctor"

#### 4. Wire up data flow
- **Fetch**: Include `mobile_number` in the `fetchDoctors` select query
- **Edit**: Pre-fill `mobile_number` in `handleEdit`
- **Create**: Pass `mobile_number` in the `doctorData` sent to the `create-user` edge function
- **Update**: Include `mobile_number` in the `.update()` call for existing doctors
- **Validation**: Block form submission if `mobileError` is set or mobile number is invalid (when provided)

#### 5. Update create-user edge function
- Add `mobile_number` to the doctor insert in `supabase/functions/create-user/index.ts`

### No Database Migration Required
The `doctors` table already has a `mobile_number` column (nullable text).

