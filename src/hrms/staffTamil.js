/**
 * Tamil for the employee screens (pure; see staffTamil.test.js). The staff portal is written in
 * English; when an employee picks தமிழ், each piece of text on their screens is looked up here —
 * exact phrases first, then patterns for text with numbers / names in it ("24m late - …").
 * Text joined with " · " is translated part by part. Text that already contains Tamil is left as it
 * is, and so are names, codes, dates and amounts.
 */
export const TA = {
  // menu, header, account
  'Overview': 'கண்ணோட்டம்', 'Home': 'முகப்பு', 'My Attendance': 'என் வருகை', 'Attendance': 'வருகை',
  'My Shift & Salary': 'என் ஷிஃப்ட் & சம்பளம்', 'My Tasks': 'என் பணிகள்', 'Tasks': 'பணிகள்',
  'Leave & Permission': 'விடுப்பு & அனுமதி', 'Leave': 'விடுப்பு', 'Payslip': 'சம்பளச் சீட்டு',
  'My Workspace': 'என் பணியிடம்', 'Change password': 'கடவுச்சொல் மாற்று', 'Sign out': 'வெளியேறு',
  'Pay cycle': 'பே சைக்கிள்', 'Payroll': 'சம்பளம்', 'Staff': 'ஊழியர்', 'Admin': 'நிர்வாகம்',
  // stats and profile
  'Present days': 'வந்த நாட்கள்', 'Late instances': 'தாமத முறைகள்', 'Permission used': 'பயன்படுத்திய அனுமதி',
  'CL used': 'பயன்படுத்திய CL', 'Lateness / LOP deduction': 'தாமதம் / சம்பள இழப்பு பிடித்தம்',
  'PF + ESI + PT + other': 'PF + ESI + PT + பிற', 'Overtime pay': 'கூடுதல் நேர ஊதியம்', 'Net payable': 'நிகர சம்பளம்',
  'CL remaining': 'மீதமுள்ள CL', 'Permission remaining': 'மீதமுள்ள அனுமதி',
  'No deductions this cycle': 'இந்த சைக்கிளில் பிடித்தம் இல்லை',
  'Not assigned — Administrator approves your requests': 'ஒதுக்கப்படவில்லை — நிர்வாகி உங்கள் கோரிக்கைகளை அனுமதிப்பார்',
  // overview lists
  'Tasks due soon': 'விரைவில் முடிக்க வேண்டிய பணிகள்', 'Recent leave / permission': 'சமீபத்திய விடுப்பு / அனுமதி',
  'No tasks assigned.': 'பணிகள் எதுவும் ஒதுக்கப்படவில்லை.', 'No requests filed.': 'கோரிக்கைகள் எதுவும் இல்லை.',
  'You are covering for:': 'நீங்கள் பணியைக் கவனிப்பது:', 'Leave updates': 'விடுப்பு அறிவிப்புகள்', 'View': 'பார்',
  // statuses
  'Present': 'வருகை', 'Absent': 'வரவில்லை', 'Week Off': 'வார விடுமுறை', 'Week off': 'வார விடுமுறை', 'Holiday': 'விடுமுறை',
  'Approved leave': 'அனுமதிக்கப்பட்ட விடுப்பு', 'Pending': 'நிலுவையில்', 'Approved': 'அனுமதிக்கப்பட்டது',
  'Rejected': 'நிராகரிக்கப்பட்டது', 'Approval withdrawn': 'அனுமதி திரும்பப் பெறப்பட்டது', 'Open': 'திறந்தது',
  'Accepted': 'ஏற்கப்பட்டது', 'Review': 'மதிப்பாய்வு', 'Done': 'முடிந்தது', 'Closed': 'மூடப்பட்டது', 'In Progress': 'நடைபெறுகிறது',
  'High': 'அதிகம்', 'Medium': 'நடுத்தரம்', 'Low': 'குறைவு',
  // day cards, today card
  'present': 'வருகை', 'late': 'தாமதம்', 'absent': 'வரவில்லை', 'Net': 'நிகரம்', 'usual': 'வழக்கம்',
  'planned': 'திட்டமிடப்பட்டது', 'On time': 'சரியான நேரம்', 'On time ✓': 'சரியான நேரம் ✓', 'No shift planned': 'ஷிஃப்ட் திட்டமிடப்படவில்லை',
  'No attendance imported for this pay cycle yet.': 'இந்த பே சைக்கிளுக்கு வருகை இன்னும் ஏற்றப்படவில்லை.',
  'From the Shift Planner; "usual" = your regular shift until your manager plans the day.': 'ஷிஃப்ட் பிளானரிலிருந்து; "வழக்கம்" = மேனேஜர் திட்டமிடும் வரை உங்கள் வழக்கமான ஷிஃப்ட்.',
  'Due': 'கடைசி தேதி', 'from': 'அனுப்பியவர்', 'Covering:': 'பணியைக் கவனிப்பவர்:',
  // tasks
  'Accept': 'ஏற்கவும்', 'Reject': 'நிராகரி', 'Mark as finished': 'முடிந்தது எனக் குறி', 'Waiting on reassignment': 'மறு ஒதுக்கீட்டிற்குக் காத்திருக்கிறது',
  'Submitted — awaiting review': 'சமர்ப்பிக்கப்பட்டது — மதிப்பாய்வுக்குக் காத்திருக்கிறது',
  // leave tab and form
  'My requests': 'என் கோரிக்கைகள்', '+ Apply for CL / Permission': '+ CL / அனுமதிக்கு விண்ணப்பி', 'Apply for CL / Permission': 'CL / அனுமதிக்கு விண்ணப்பி',
  'Company holidays this cycle': 'இந்த சைக்கிளின் நிறுவன விடுமுறைகள்', 'No requests yet.': 'கோரிக்கைகள் எதுவும் இல்லை.',
  'Type': 'வகை', 'Date': 'தேதி', 'Hours': 'மணி நேரம்', 'Reason': 'காரணம்', 'Casual Leave': 'தற்செயல் விடுப்பு',
  'Permission': 'அனுமதி (பர்மிஷன்)', 'Permission (hours)': 'அனுமதி (மணி நேரம்)', 'Reporting Manager (approver)': 'ரிப்போர்டிங் மேனேஜர் (அனுமதிப்பவர்)',
  'Alternative employee covering your work (required, same unit)': 'உங்கள் பணியைக் கவனிக்கும் மாற்று ஊழியர் (கட்டாயம், அதே யூனிட்)',
  'Select a colleague…': 'ஒரு சக ஊழியரைத் தேர்வுசெய்க…', 'Submit request': 'கோரிக்கையைச் சமர்ப்பி', 'Reason for request': 'கோரிக்கைக்கான காரணம்',
  'No reporting manager assigned — please contact HR/Admin': 'ரிப்போர்டிங் மேனேஜர் ஒதுக்கப்படவில்லை — HR / நிர்வாகியைத் தொடர்பு கொள்ளுங்கள்',
  'ID': 'எண்', 'Status': 'நிலை',
  // payslip
  'Employee': 'ஊழியர்', 'Designation': 'பதவி', 'Department': 'துறை', 'Gross salary': 'மொத்த சம்பளம்',
  'Provident Fund': 'வருங்கால வைப்பு நிதி (PF)', 'Professional Tax': 'தொழில் வரி', 'Other deduction': 'பிற பிடித்தம்',
  'Print / Save as PDF': 'அச்சிடு / PDF ஆகச் சேமி', 'Download PDF': 'PDF பதிவிறக்கு',
  // password
  'Current password': 'தற்போதைய கடவுச்சொல்', 'New password': 'புதிய கடவுச்சொல்', 'Confirm new password': 'புதிய கடவுச்சொல்லை உறுதிசெய்', 'Update password': 'கடவுச்சொல்லைப் புதுப்பி',
  // sign-in page
  'Welcome back': 'மீண்டும் வருக', 'Sign in with your Staff Code and password.': 'உங்கள் ஸ்டாஃப் கோடு மற்றும் கடவுச்சொல் மூலம் உள்நுழையுங்கள்.',
  'Staff Code': 'ஸ்டாஃப் கோடு', 'Password': 'கடவுச்சொல்', 'Sign in': 'உள்நுழை', 'Admin / Manager': 'நிர்வாகி / மேனேஜர்',
  'First sign-in: your password is your Staff Code until you change it.': 'முதல் உள்நுழைவு: நீங்கள் மாற்றும் வரை உங்கள் கடவுச்சொல் உங்கள் ஸ்டாஃப் கோடுதான்.',
  'Signing in here signs this account out of any other device.': 'இங்கே உள்நுழைந்தால் மற்ற சாதனங்களிலிருந்து இந்தக் கணக்கு வெளியேற்றப்படும்.',
  'Caps Lock is on': 'Caps Lock இயக்கத்தில் உள்ளது',
  // day notes
  'Declared holiday - no impact regardless of punch': 'அறிவிக்கப்பட்ட விடுமுறை — பதிவு எதுவாக இருந்தாலும் பாதிப்பில்லை',
  'Approved leave (set by reporting manager) - paid, CL not used': 'அனுமதிக்கப்பட்ட விடுப்பு (மேனேஜர் குறித்தது) — சம்பளத்துடன், CL பயன்படவில்லை',
  'Casual leave (paid)': 'தற்செயல் விடுப்பு (சம்பளத்துடன்)', 'CL quota exhausted - day unpaid': 'CL இருப்பு முடிந்தது — சம்பளமில்லா நாள்',
  'Unplanned absence - auto-covered by CL': 'முன்அறிவிப்பில்லா விடுமுறை — CL மூலம் ஈடுசெய்யப்பட்டது',
  'Unplanned absence - loss of pay': 'முன்அறிவிப்பில்லா விடுமுறை — சம்பள இழப்பு',
  'Missing OUT punch — counted present': 'OUT பதிவு இல்லை — வருகையாகக் கணக்கிடப்பட்டது',
  'Weekly off (planned in Shift Planner)': 'வார விடுமுறை (ஷிஃப்ட் பிளானரில் திட்டமிடப்பட்டது)',
  '8h consolidated lateness offset using CL': '8 மணி மொத்த தாமதம் CL மூலம் ஈடுசெய்யப்பட்டது',
  '8h consolidated lateness = 1 day loss of pay': '8 மணி மொத்த தாமதம் = 1 நாள் சம்பள இழப்பு',
};

const PATTERNS = [
  [/^(\d+)m late - inside the (\d+)m grace for (.+), no impact$/, (m) => `${m[1]} நிமி தாமதம் — ${m[3]} சலுகை நேரம் ${m[2]} நிமிக்குள், பாதிப்பில்லை`],
  [/^(\d+)m late - no approved permission, (\d+)m deducted from pay$/, (m) => `${m[1]} நிமி தாமதம் — அனுமதி இல்லை, ${m[2]} நிமி சம்பளத்தில் பிடித்தம்`],
  [/^(\d+)m late - permission balance used up, (\d+)m deducted from pay$/, (m) => `${m[1]} நிமி தாமதம் — அனுமதி இருப்பு முடிந்தது, ${m[2]} நிமி சம்பளத்தில் பிடித்தம்`],
  [/^(\d+)m late - covered by approved permission \((.+)\)$/, (m) => `${m[1]} நிமி தாமதம் — அனுமதிக்கப்பட்ட பர்மிஷனால் ஈடுசெய்யப்பட்டது (${m[2]})`],
  [/^Late (.+)$/, (m) => `தாமதம் ${m[1]}`],
  [/^(.+) \(grace\)$/, (m) => `${m[1]} (சலுகை)`],
  [/^Permission (\d.*)$/, (m) => `அனுமதி ${m[1]}`],
  [/^Staff Code (\S+)$/, (m) => `ஸ்டாஃப் கோடு ${m[1]}`],
  [/^Reporting Manager: (.+)$/, (m) => `ரிப்போர்டிங் மேனேஜர்: ${m[1]}`],
  [/^Gross Salary (.+)$/, (m) => `மொத்த சம்பளம் ${m[1]}`],
  [/^Net Payable (.+)$/, (m) => `நிகர சம்பளம் ${m[1]}`],
  [/^Approved by (.+)$/, (m) => `அனுமதித்தவர் ${m[1]}`],
  [/^Rejected by (.+)$/, (m) => `நிராகரித்தவர் ${m[1]}`],
  [/^Withdrawn by (.+)$/, (m) => `திரும்பப் பெற்றவர் ${m[1]}`],
  [/^Night shift from (\S+) \(OUT punch is next morning\)$/, (m) => `இரவு ஷிஃப்ட் ${m[1]} முதல் (OUT மறுநாள் காலை)`],
  [/^Off after night duty \((.+)\)$/, () => 'இரவுப் பணிக்குப் பின் ஓய்வு'],
  [/^Weekly off \((.+)\)$/, (m) => `வார விடுமுறை (${m[1]})`],
];

const TAMIL = /[஀-௿]/;

function one(text) {
  if (Object.prototype.hasOwnProperty.call(TA, text)) return TA[text];
  for (const [re, fn] of PATTERNS) { const m = re.exec(text); if (m) return fn(m); }
  return null;
}

/** Tamil for a piece of screen text, or null to leave it as it is. Keeps surrounding spaces. */
export function translateText(raw) {
  const s = String(raw ?? '');
  const text = s.trim();
  if (!text || TAMIL.test(text) || !/[A-Za-z]/.test(text)) return null;
  const lead = s.slice(0, s.indexOf(text)), trail = s.slice(s.indexOf(text) + text.length);
  let out = one(text);
  if (out === null && text.includes(' · ')) {
    const parts = text.split(' · ');
    const tr = parts.map(p => one(p.trim()));
    if (tr.some(x => x !== null)) out = parts.map((p, i) => tr[i] ?? p).join(' · ');
  }
  return out === null ? null : lead + out + trail;
}
