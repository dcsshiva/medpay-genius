

## Add Help Guide Navigation to Sign-In Page

### Overview
Add a "Help Guide" link on the sign-in page below the version details that navigates to a publicly accessible user guide page. The guide will include all enhancements and PDF download capability.

---

### Current Architecture

- **User Guide Page**: Already exists at `src/pages/UserGuide.tsx` with role-based content
- **Access Method**: Currently only accessible after login via dashboard (`/dashboard?view=user-guide`)
- **PDF Support**: `jspdf` and `jspdf-autotable` already installed for PDF generation
- **Auth Page**: Located at `src/pages/Auth.tsx` with version info at lines 487-492

---

### Implementation Plan

#### 1. Create Public User Guide Route

**File: `src/App.tsx`**

Add a new route for the public help guide accessible without authentication:

```typescript
import PublicUserGuide from "./pages/PublicUserGuide";

// Add route before the catch-all
<Route path="/help-guide" element={<PublicUserGuide />} />
```

---

#### 2. Create PublicUserGuide Component

**New File: `src/pages/PublicUserGuide.tsx`**

A standalone public version of the user guide that:
- Does NOT require authentication (accessible from sign-in page)
- Shows general help content for all roles
- Includes PDF download button using `jspdf`
- Has a "Back to Sign In" navigation link
- Uses the same styling as the dashboard guide but simplified

**Key Sections:**
| Section | Content |
|---------|---------|
| Overview | What is WestMed Hospital Admin System |
| Getting Started | General getting started for all roles |
| Role Information | Brief description of Admin, Manager, Doctor, Staff roles |
| Key Features | Visit Management, Payments, Bank Advice, Reports |
| FAQ | Common questions (from database settings) |
| Help & Support | Contact information |

**PDF Generation Features:**
- "Download as PDF" button in header
- Generates multi-page PDF with all guide content
- Uses `jspdf` with proper formatting
- Works on both web and mobile (using existing `fileDownload.ts` utility)

---

#### 3. Update Auth Page

**File: `src/pages/Auth.tsx`**

Add help guide link below the version display (after line 492):

```tsx
{/* Help Guide Link */}
<Button
  variant="link"
  className="text-white/80 hover:text-white text-xs"
  onClick={() => navigate('/help-guide')}
>
  <BookOpen className="h-3 w-3 mr-1" />
  Help Guide
</Button>
```

**Visual Layout:**
```
┌─────────────────────────────────────┐
│       [Sign in with OTP Card]       │
├─────────────────────────────────────┤
│      [Install App Button]           │
│      [Check Updates]                │
│                                     │
│      Version 1.0.0-dev              │
│      Build: abc1234                 │
│                                     │
│      📖 Help Guide  ← NEW LINK      │
└─────────────────────────────────────┘
```

---

#### 4. PublicUserGuide Component Structure

```text
┌─────────────────────────────────────────────────────────┐
│ 📖 WestMed Hospital - User Guide      [PDF] [← Sign In]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Overview Card]                                        │
│  Welcome to WestMed Hospital Management System          │
│  Brief description of the system                        │
│                                                         │
│  [Getting Started Card]                                 │
│  - How to sign in with OTP                              │
│  - First time login steps                               │
│  - PWA installation instructions                        │
│                                                         │
│  [Roles & Permissions Card]                             │
│  ┌─────────┬─────────┬─────────┬─────────┐              │
│  │ Admin   │ Manager │ Doctor  │ Staff   │              │
│  └─────────┴─────────┴─────────┴─────────┘              │
│                                                         │
│  [Key Features Card - Accordion]                        │
│  ▸ Visit Management                                     │
│  ▸ Payment Management                                   │
│  ▸ Bank Advice Generation                               │
│  ▸ Reports & Exports                                    │
│  ▸ Task Management                                      │
│  ▸ Team Communication                                   │
│                                                         │
│  [FAQ Card - Accordion]                                 │
│  ▸ How do I reset my password?                          │
│  ▸ Why do I get logged out automatically?               │
│  ▸ How do I record patient visits?                      │
│                                                         │
│  [Help & Support Card]                                  │
│  ┌─────────┬─────────┬─────────┐                        │
│  │ Phone   │ Email   │ Hours   │                        │
│  └─────────┴─────────┴─────────┘                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

#### 5. PDF Download Implementation

**PDF Generation Function:**

```typescript
const generatePDF = async () => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Title Page
  doc.setFontSize(24);
  doc.text('WestMed Hospital', 105, 40, { align: 'center' });
  doc.setFontSize(18);
  doc.text('User Guide', 105, 55, { align: 'center' });
  
  // Add sections with proper formatting
  // - Overview
  // - Getting Started
  // - Roles & Permissions
  // - Key Features
  // - FAQ
  // - Support Information
  
  // Save with timestamp
  doc.save(`WestMed_User_Guide_${formatFileTimestampIST(new Date())}.pdf`);
};
```

**PDF Content Sections:**
1. **Cover Page**: Hospital name, "User Guide" title, generation date
2. **Table of Contents**: Section list with page numbers
3. **Overview**: System description
4. **Getting Started**: Step-by-step login instructions
5. **Role Descriptions**: What each role can do
6. **Feature Guide**: Brief description of main features
7. **FAQ**: All frequently asked questions
8. **Support Contact**: Help desk information

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/PublicUserGuide.tsx` | Public help guide page with PDF download |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/help-guide` route |
| `src/pages/Auth.tsx` | Add Help Guide link below version |

---

### Technical Considerations

1. **No Authentication Required**: Public route accessible before login
2. **Settings Fallback**: If database settings unavailable, use hardcoded defaults
3. **PDF Font Compatibility**: Replace special characters (₹ → Rs.) for PDF
4. **Mobile Compatibility**: Use `downloadFile` utility for native app support
5. **Responsive Design**: Works on both desktop and mobile screens
6. **Print CSS**: Include `.no-print` classes for elements to hide when printing

---

### Accessibility Features

- Clear navigation with "Back to Sign In" button
- High contrast text on background
- Keyboard navigable accordions
- Screen reader friendly structure
- PDF download as alternative format

