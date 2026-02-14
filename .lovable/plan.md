

## Add Mobile Number OTP Login (using SoftSMS)

### Overview
Add a mobile number OTP login option alongside the existing email OTP login on the Auth page. Users can toggle between "Email OTP" and "Mobile OTP" tabs. The SMS will be sent via the **SoftSMS** API. Only registered users (staff or doctors with a mobile number on file) can log in this way.

---

### Current State and Issues

- The `send-otp` edge function currently uses **MSG91** -- it will be updated to use **SoftSMS**
- The `verify-otp` edge function queries `staff.mobile_number` and `doctors.mobile_number`, but:
  - Staff table has a `phone` column (not `mobile_number`)
  - Doctors table has **no mobile column at all**
- The `auth.tsx` already has `sendMobileOTP` and `verifyMobileOTP` methods wired up
- The Auth.tsx UI currently only shows the email OTP flow

---

### What Will Change

#### 1. Database Migration
- Add a `mobile_number` column to the `doctors` table (text, nullable) so doctors can also use mobile OTP login

#### 2. Update `send-otp` Edge Function
- Replace MSG91 API call with **SoftSMS** API:
  ```
  https://softsms.in/app/smsapi/index.php?key=<API Key>&type=text&contacts=91<mobile>&senderid=<Sender ID>&peid=<PE ID>&templateid=<Template ID>&msg=Your OTP is <OTP>
  ```
- Before sending OTP, verify the mobile number exists in either `staff.phone` or `doctors.mobile_number` (only registered users)
- If no registered user found, return an error: "No registered user found with this mobile number"

#### 3. Update `verify-otp` Edge Function
- Fix the user lookup queries:
  - Staff: query `staff.phone` instead of `staff.mobile_number`
  - Doctors: query `doctors.mobile_number` (the new column)

#### 4. Update Auth.tsx UI
- Add two tabs at the top of the login card: "Email OTP" and "Mobile OTP"
- **Email OTP tab**: Current flow (unchanged)
- **Mobile OTP tab**:
  - Input field for 10-digit mobile number
  - "Send OTP" button
  - After OTP sent: 6-digit OTP input (same InputOTP component)
  - Auto-verify on 6 digits entered
  - Resend cooldown timer
  - "Change Number" link
- After successful mobile OTP verification, same role-based routing logic as email OTP (doctor hub, staff dashboard, etc.)

#### 5. New Secrets Required
The following secrets need to be added for the SoftSMS integration:
- `SOFTSMS_API_KEY` -- API key from SoftSMS
- `SOFTSMS_SENDER_ID` -- Sender ID registered with SoftSMS
- `SOFTSMS_PE_ID` -- Principal Entity ID for DLT
- `SOFTSMS_TEMPLATE_ID` -- Template ID registered on DLT

---

### Technical Details

#### Database Migration
```sql
ALTER TABLE public.doctors ADD COLUMN mobile_number text;
```

#### Edge Function: `send-otp` Changes
- Check if mobile exists in `staff.phone` or `doctors.mobile_number` before proceeding
- Replace MSG91 fetch with SoftSMS GET request
- Use environment secrets for SoftSMS configuration

#### Edge Function: `verify-otp` Changes
- Staff lookup: `.eq('phone', mobile)` instead of `.eq('mobile_number', mobile)`
- Doctor lookup: `.eq('mobile_number', mobile)` (now valid with new column)

#### Auth.tsx UI Changes
- Add `loginMethod` state: `'email' | 'mobile'`
- Add `mobileNumber` state for input
- Two-tab layout using simple button toggle or Tabs component
- Mobile OTP flow calls `sendMobileOTP(mobileNumber)` and `verifyMobileOTP(mobileNumber, otpCode)`
- After `verifyMobileOTP` succeeds, the auth context already handles session creation and user/role setup
- Role-based navigation after mobile OTP (same logic as email OTP in Auth.tsx):
  - Doctor -> `/dashboard?view=doctor-hub`
  - Admin/Manager -> `/dashboard?view=doctor-hub`
  - Staff/Nurse -> mobile: `/dashboard?view=staff`, desktop: `/dashboard`

---

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Add `mobile_number` column to `doctors` table |
| `supabase/functions/send-otp/index.ts` | Replace MSG91 with SoftSMS; add registered-user check |
| `supabase/functions/verify-otp/index.ts` | Fix column names: `staff.phone`, `doctors.mobile_number` |
| `src/pages/Auth.tsx` | Add Email/Mobile tab toggle; mobile OTP input and verification UI |
| Secrets | Add SOFTSMS_API_KEY, SOFTSMS_SENDER_ID, SOFTSMS_PE_ID, SOFTSMS_TEMPLATE_ID |

