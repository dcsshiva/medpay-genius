/**
 * Help for every screen of the WestMed Payroll System, in English and Tamil (pure data; see
 * helpContent.test.js). The Help button opens the entry for the screen in view (helpKey); the
 * printable help document lists them all (HELP_ORDER).
 *
 * Each entry: { title, intro, steps[], tips[] }, every field as { en, ta } — steps and tips are
 * lists of the same length in both languages.
 */
const t = (en, ta) => ({ en, ta });
const list = (pairs) => ({ en: pairs.map(p => p[0]), ta: pairs.map(p => p[1]) });

export const HELP = {
  about: {
    title: t('About the application', 'இந்த மென்பொருள் பற்றி'),
    intro: t(
      'WestMed Payroll System brings attendance, shifts, leave and permission, tasks and salary for every WestMed unit into one place. Biometric punches are imported every day, checked against each person\'s shift, and turned into lateness, leave and salary automatically. It is built and supported by Selvantra Technologies.',
      'வெஸ்ட்மெட் பேரோல் சிஸ்டம் — ஒவ்வொரு வெஸ்ட்மெட் யூனிட்டின் வருகைப்பதிவு, ஷிஃப்ட், விடுப்பு மற்றும் அனுமதி (பர்மிஷன்), பணிகள், சம்பளம் அனைத்தையும் ஒரே இடத்தில் கொண்டுவருகிறது. பயோமெட்ரிக் பதிவுகள் தினமும் ஏற்றப்பட்டு, ஒவ்வொருவரின் ஷிஃப்ட்டுடன் ஒப்பிடப்பட்டு, தாமதம், விடுப்பு, சம்பளம் தானாகக் கணக்கிடப்படுகின்றன. இதை உருவாக்கி பராமரிப்பது செல்வன்ட்ரா டெக்னாலஜீஸ்.'),
    steps: list([
      ['Staff sign in with their Staff Code to see their attendance, shifts, leave, tasks and payslip.',
        'ஊழியர்கள் தங்கள் ஸ்டாஃப் கோடு மூலம் உள்நுழைந்து தங்கள் வருகை, ஷிஃப்ட், விடுப்பு, பணிகள், சம்பளச் சீட்டைப் பார்க்கலாம்.'],
      ['Reporting managers sign in with their Staff Code (role Manager) to plan shifts and approve requests for their own staff.',
        'ரிப்போர்டிங் மேனேஜர்கள் தங்கள் ஸ்டாஃப் கோடு மூலம் (Manager பங்கு) உள்நுழைந்து தங்கள் ஊழியர்களுக்கு ஷிஃப்ட் திட்டமிடலாம், கோரிக்கைகளை அனுமதிக்கலாம்.'],
      ['Administrators sign in with their WestMed email to manage staff, masters, attendance import, salary and reports.',
        'நிர்வாகிகள் (Admin) தங்கள் வெஸ்ட்மெட் மின்னஞ்சல் மூலம் உள்நுழைந்து ஊழியர்கள், மாஸ்டர்கள், வருகை இறக்குமதி, சம்பளம், அறிக்கைகளை நிர்வகிக்கலாம்.'],
      ['The pay cycle selector at the top chooses which month you are working on (for example 26 Oct – 25 Nov).',
        'மேலே உள்ள பே சைக்கிள் தேர்வில் எந்த மாதத்தைப் பார்க்கிறீர்கள் என்பதைத் தேர்வுசெய்யலாம் (உதா: 26 அக் – 25 நவ).'],
      ['Every change saves by itself; "Saving…" shows at the bottom while it is being saved.',
        'ஒவ்வொரு மாற்றமும் தானாகச் சேமிக்கப்படும்; சேமிக்கும்போது கீழே "Saving…" என்று தெரியும்.'],
      ['Press Help (உதவி) on any screen to read about that screen, in English and Tamil.',
        'எந்தத் திரையிலும் Help (உதவி) அழுத்தினால் அந்தத் திரை பற்றிய விளக்கம் ஆங்கிலம் மற்றும் தமிழில் கிடைக்கும்.'],
    ]),
    tips: list([
      ['Keep the Shift Planner complete and import both units\' biometric files every day — attendance and salary depend on them.',
        'ஷிஃப்ட் பிளானரை முழுமையாக வைத்திருங்கள்; இரண்டு யூனிட்டுகளின் பயோமெட்ரிக் கோப்புகளையும் தினமும் ஏற்றுங்கள் — வருகையும் சம்பளமும் இவற்றைச் சார்ந்தவை.'],
      ['Signing in on one device signs the same account out of any other device.',
        'ஒரு சாதனத்தில் உள்நுழைந்தால், அதே கணக்கு மற்ற சாதனங்களிலிருந்து வெளியேற்றப்படும்.'],
      ['For support contact Selvantra Technologies (selvantra.com).',
        'உதவிக்கு செல்வன்ட்ரா டெக்னாலஜீஸைத் தொடர்பு கொள்ளுங்கள் (selvantra.com).'],
    ]),
  },

  login: {
    title: t('Signing in', 'உள்நுழைதல்'),
    intro: t('Choose Staff or Admin / Manager, then enter your login and password.',
      'Staff அல்லது Admin / Manager என்பதைத் தேர்வுசெய்து, உங்கள் உள்நுழைவு விவரம் மற்றும் கடவுச்சொல்லை உள்ளிடுங்கள்.'),
    steps: list([
      ['Staff: enter your Staff Code. On your first sign-in the password is also your Staff Code.',
        'ஊழியர்: உங்கள் ஸ்டாஃப் கோடை உள்ளிடுங்கள். முதல் முறை கடவுச்சொல்லும் உங்கள் ஸ்டாஃப் கோடுதான்.'],
      ['You will be asked to set a new password the first time — choose one only you know.',
        'முதல் முறை புதிய கடவுச்சொல் அமைக்கக் கேட்கப்படும் — உங்களுக்கு மட்டும் தெரிந்த ஒன்றைத் தேர்வுசெய்யுங்கள்.'],
      ['Managers: use the Admin / Manager tab with your Staff Code (your role must be Manager in Staff Master).',
        'மேனேஜர்கள்: Admin / Manager பகுதியில் உங்கள் ஸ்டாஃப் கோடைப் பயன்படுத்துங்கள் (Staff Master-இல் உங்கள் பங்கு Manager ஆக இருக்க வேண்டும்).'],
      ['Administrators: use your WestMed email and password.',
        'நிர்வாகிகள்: உங்கள் வெஸ்ட்மெட் மின்னஞ்சல் மற்றும் கடவுச்சொல்லைப் பயன்படுத்துங்கள்.'],
    ]),
    tips: list([
      ['Forgot your password? Ask your administrator to reset it.',
        'கடவுச்சொல் மறந்துவிட்டதா? நிர்வாகியிடம் மீட்டமைக்கச் சொல்லுங்கள்.'],
      ['"Caps Lock is on" warns you when capital letters are switched on.',
        'பெரிய எழுத்து (Caps Lock) இயக்கத்தில் இருந்தால் "Caps Lock is on" என்று எச்சரிக்கை வரும்.'],
    ]),
  },

  'staff.overview': {
    title: t('My overview', 'என் சுருக்கம்'),
    intro: t('Your pay cycle at a glance: days present, absent, late, leave used and balances.',
      'உங்கள் பே சைக்கிளின் சுருக்கம்: வந்த நாட்கள், வராத நாட்கள், தாமதம், பயன்படுத்திய விடுப்பு, மீதமுள்ள இருப்பு.'),
    steps: list([
      ['Present days are counted against all the days of the pay cycle (for example 20 / 31).',
        'வந்த நாட்கள் பே சைக்கிளின் மொத்த நாட்களுடன் ஒப்பிட்டுக் காட்டப்படும் (உதா: 20 / 31).'],
      ['CL and permission balances show what you can still use this month.',
        'CL மற்றும் பர்மிஷன் இருப்பு இந்த மாதம் இன்னும் எவ்வளவு பயன்படுத்தலாம் என்பதைக் காட்டும்.'],
      ['"You are covering for" lists colleagues whose work you cover while they are on leave.',
        '"You are covering for" — நீங்கள் யாருடைய விடுப்பின்போது அவர்கள் பணியைக் கவனிக்கிறீர்கள் என்பதைக் காட்டும்.'],
      ['Use the menu at the top to open your attendance, tasks, leave and payslip.',
        'மேலே உள்ள மெனுவில் உங்கள் வருகை, பணிகள், விடுப்பு, சம்பளச் சீட்டைத் திறக்கலாம்.'],
    ]),
    tips: list([
      ['If a day looks wrong, tell your reporting manager — they can correct the shift plan or mark leave / week off.',
        'ஏதேனும் நாள் தவறாகத் தெரிந்தால் உங்கள் ரிப்போர்டிங் மேனேஜரிடம் சொல்லுங்கள் — அவர் ஷிஃப்ட் திட்டத்தைச் சரிசெய்யலாம் அல்லது விடுப்பு / வார விடுமுறையாகக் குறிக்கலாம்.'],
    ]),
  },

  'staff.ledger': {
    title: t('My attendance / shift & salary', 'என் வருகை / ஷிஃப்ட் & சம்பளம்'),
    intro: t('Every day of the pay cycle with your IN and OUT punch, the shift used, lateness and its effect.',
      'பே சைக்கிளின் ஒவ்வொரு நாளும் — உங்கள் IN, OUT பதிவு, பயன்படுத்தப்பட்ட ஷிஃப்ட், தாமதம், அதன் விளைவு.'),
    steps: list([
      ['P = present, A = absent, WO = weekly off, H = holiday, CL = casual leave, AL = approved leave.',
        'P = வருகை, A = வரவில்லை, WO = வார விடுமுறை, H = அரசு / நிறுவன விடுமுறை, CL = தற்செயல் விடுப்பு, AL = அனுமதிக்கப்பட்ட விடுப்பு.'],
      ['Lateness is counted from the start of your shift after the grace time (usually 10 minutes).',
        'தாமதம் உங்கள் ஷிஃப்ட் தொடக்க நேரத்திலிருந்து, சலுகை நேரத்திற்குப் (பொதுவாக 10 நிமிடம்) பிறகு கணக்கிடப்படும்.'],
      ['Approved permission covers lateness first; what is left may be deducted from pay.',
        'அனுமதிக்கப்பட்ட பர்மிஷன் முதலில் தாமதத்தை ஈடுசெய்யும்; மீதி இருந்தால் சம்பளத்தில் பிடித்தம் செய்யப்படலாம்.'],
      ['An absence uses your CL while you have CL left; after that it is loss of pay.',
        'CL இருப்பு இருக்கும் வரை வராத நாள் CL-ஆகக் கணக்கிடப்படும்; அதன்பின் சம்பள இழப்பு (LOP).'],
      ['Night shifts: the evening IN and the next morning\'s OUT are joined into one shift.',
        'இரவு ஷிஃப்ட்: மாலை IN-உம் மறுநாள் காலை OUT-உம் ஒரே ஷிஃப்டாக இணைக்கப்படும்.'],
    ]),
    tips: list([
      ['Always punch both IN and OUT. A missing punch can make a day look wrong.',
        'எப்போதும் IN மற்றும் OUT இரண்டையும் பதிவு செய்யுங்கள். ஒரு பதிவு விடுபட்டால் அந்த நாள் தவறாகத் தெரியலாம்.'],
    ]),
  },

  'staff.tasks': {
    title: t('My tasks', 'என் பணிகள்'),
    intro: t('Work assigned to you by your manager or administrator.',
      'உங்கள் மேனேஜர் அல்லது நிர்வாகி உங்களுக்கு ஒதுக்கிய பணிகள்.'),
    steps: list([
      ['Accept a task to start it, or reject it with a reason.',
        'பணியைத் தொடங்க Accept செய்யுங்கள், அல்லது காரணத்துடன் Reject செய்யுங்கள்.'],
      ['When finished, mark it done with a short completion note — it goes to review.',
        'முடிந்ததும் சிறு குறிப்புடன் Done எனக் குறியுங்கள் — அது மதிப்பாய்வுக்குச் செல்லும்.'],
      ['Watch the due date and priority shown on each task.',
        'ஒவ்வொரு பணியிலும் உள்ள கடைசி தேதி மற்றும் முன்னுரிமையைக் கவனியுங்கள்.'],
    ]),
    tips: list([
      ['Your manager closes the task after reviewing it.',
        'மதிப்பாய்வு செய்த பிறகு உங்கள் மேனேஜர் பணியை மூடுவார்.'],
    ]),
  },

  'staff.leave': {
    title: t('Leave & permission', 'விடுப்பு & அனுமதி'),
    intro: t('Apply for Casual Leave (CL) or a few hours\' permission, and follow your requests.',
      'தற்செயல் விடுப்பு (CL) அல்லது சில மணி நேர அனுமதி (பர்மிஷன்) விண்ணப்பித்து, உங்கள் கோரிக்கைகளைப் பின்தொடருங்கள்.'),
    steps: list([
      ['Choose CL or Permission, the date (and hours for permission) and a reason.',
        'CL அல்லது Permission, தேதி (பர்மிஷனுக்கு மணி நேரம்), காரணம் ஆகியவற்றைத் தேர்வுசெய்யுங்கள்.'],
      ['Pick an alternative employee from your unit who will cover your work.',
        'உங்கள் பணியைக் கவனிக்க உங்கள் யூனிட்டில் இருந்து ஒரு மாற்று ஊழியரைத் தேர்வுசெய்யுங்கள்.'],
      ['The request goes to your reporting manager, who approves or rejects it.',
        'கோரிக்கை உங்கள் ரிப்போர்டிங் மேனேஜருக்குச் செல்லும்; அவர் அனுமதிப்பார் அல்லது நிராகரிப்பார்.'],
      ['An approved CL marks that day as CL in your attendance.',
        'அனுமதிக்கப்பட்ட CL அந்த நாளை உங்கள் வருகையில் CL எனக் குறிக்கும்.'],
    ]),
    tips: list([
      ['No reporting manager shown? Contact HR — requests cannot be sent without one.',
        'ரிப்போர்டிங் மேனேஜர் காட்டப்படவில்லையா? HR-ஐத் தொடர்பு கொள்ளுங்கள் — அவர் இல்லாமல் கோரிக்கை அனுப்ப முடியாது.'],
      ['An approval can be withdrawn by your manager in the running or previous pay cycle.',
        'நடப்பு அல்லது முந்தைய பே சைக்கிளில் உங்கள் மேனேஜர் அனுமதியைத் திரும்பப் பெறலாம்.'],
    ]),
  },

  'staff.payslip': {
    title: t('Payslip', 'சம்பளச் சீட்டு'),
    intro: t('Your salary for the selected pay cycle: earnings, deductions and net pay.',
      'தேர்ந்தெடுத்த பே சைக்கிளுக்கான உங்கள் சம்பளம்: வருமானம், பிடித்தங்கள், நிகர சம்பளம்.'),
    steps: list([
      ['Choose the pay cycle at the top to see that month.',
        'அந்த மாதத்தைப் பார்க்க மேலே பே சைக்கிளைத் தேர்வுசெய்யுங்கள்.'],
      ['Deductions include loss of pay, lateness, PF, ESI and professional tax where they apply.',
        'பிடித்தங்களில் சம்பள இழப்பு, தாமதம், PF, ESI, தொழில் வரி ஆகியவை பொருந்தும் இடங்களில் அடங்கும்.'],
      ['Use Print or Download PDF to keep a copy.',
        'நகல் வைத்துக்கொள்ள Print அல்லது Download PDF பயன்படுத்துங்கள்.'],
    ]),
    tips: list([
      ['Figures are final only after HR finalizes the pay cycle.',
        'HR பே சைக்கிளை இறுதிசெய்த பிறகே தொகைகள் இறுதியானவை.'],
    ]),
  },

  'admin.overview': {
    title: t('Overview (dashboard)', 'கண்ணோட்டம் (டாஷ்போர்டு)'),
    intro: t('The whole organisation at a glance for the selected pay cycle and unit.',
      'தேர்ந்தெடுத்த பே சைக்கிள் மற்றும் யூனிட்டுக்கான முழு நிறுவனத்தின் சுருக்கம்.'),
    steps: list([
      ['Click any card (Total staff, Pending leave, Reporting managers…) to open its details.',
        'எந்த அட்டையையும் (மொத்த ஊழியர், நிலுவை விடுப்பு, ரிப்போர்டிங் மேனேஜர்கள்…) அழுத்தி அதன் விவரங்களைத் திறக்கலாம்.'],
      ['The daily attendance chart and calendar show present / absent per unit; click a day for the list of staff.',
        'தினசரி வருகை வரைபடமும் காலண்டரும் யூனிட் வாரியாக வருகை / வராதவர்களைக் காட்டும்; ஒரு நாளை அழுத்தினால் ஊழியர் பட்டியல் வரும்.'],
      ['"Staff with no Reporting Manager" should be zero — assign managers from that card.',
        '"Staff with no Reporting Manager" பூஜ்ஜியமாக இருக்க வேண்டும் — அந்த அட்டையிலிருந்தே மேனேஜர்களை ஒதுக்குங்கள்.'],
      ['Use the unit selector at the top right to see one unit or all units.',
        'மேலே வலதுபுறம் உள்ள யூனிட் தேர்வில் ஒரு யூனிட் அல்லது அனைத்து யூனிட்டுகளையும் பார்க்கலாம்.'],
    ]),
    tips: list([
      ['The bell (🔔) shows tasks sent to your account; open it to read the steps and mark them done.',
        'மணி (🔔) உங்கள் கணக்கிற்கு அனுப்பப்பட்ட பணிகளைக் காட்டும்; திறந்து வழிமுறைகளைப் படித்து Done எனக் குறியுங்கள்.'],
    ]),
  },

  'manager.overview': {
    title: t('Overview for reporting managers', 'ரிப்போர்டிங் மேனேஜருக்கான கண்ணோட்டம்'),
    intro: t('Your own staff today: who is in, who is out, pending requests and tasks.',
      'இன்று உங்கள் ஊழியர்கள்: யார் வந்துள்ளனர், யார் இல்லை, நிலுவையிலுள்ள கோரிக்கைகள், பணிகள்.'),
    steps: list([
      ['Check pending leave and permission requests and decide them quickly.',
        'நிலுவையிலுள்ள விடுப்பு / பர்மிஷன் கோரிக்கைகளைச் சரிபார்த்து விரைவில் முடிவு செய்யுங்கள்.'],
      ['Today\'s snapshot shows each of your staff with their punch and shift.',
        'இன்றைய நிலை ஒவ்வொரு ஊழியரின் பதிவையும் ஷிஃப்டையும் காட்டும்.'],
      ['Plan your staff\'s shifts in the Shift Planner before each day.',
        'ஒவ்வொரு நாளுக்கும் முன்பே ஷிஃப்ட் பிளானரில் உங்கள் ஊழியர்களின் ஷிஃப்டைத் திட்டமிடுங்கள்.'],
    ]),
    tips: list([
      ['You only see and change your own reporting staff.',
        'உங்களுக்குக் கீழ் ரிப்போர்ட் செய்யும் ஊழியர்களை மட்டுமே நீங்கள் பார்க்கவும் மாற்றவும் முடியும்.'],
    ]),
  },

  'admin.staff': {
    title: t('Staff Master', 'ஊழியர் விவரப் பதிவேடு (Staff Master)'),
    intro: t('Every employee\'s record: code, name, role, reporting manager, department, unit, shift, weekly off, salary and leave quota.',
      'ஒவ்வொரு ஊழியரின் பதிவு: கோடு, பெயர், பங்கு, ரிப்போர்டிங் மேனேஜர், துறை, யூனிட், ஷிஃப்ட், வார விடுமுறை, சம்பளம், விடுப்பு ஒதுக்கீடு.'),
    steps: list([
      ['Edit any cell directly in the table — it saves by itself.',
        'அட்டவணையில் எந்தக் கட்டத்தையும் நேரடியாகத் திருத்தலாம் — தானாகச் சேமிக்கப்படும்.'],
      ['+ Add staff adds one person; the import sheet adds many at once.',
        '+ Add staff ஒருவரைச் சேர்க்கும்; இறக்குமதித் தாள் பலரை ஒரே நேரத்தில் சேர்க்கும்.'],
      ['Set Role = Manager for reporting managers, then choose each person\'s Reporting Manager (tick several staff to set them together).',
        'ரிப்போர்டிங் மேனேஜர்களுக்கு Role = Manager அமைத்து, ஒவ்வொருவரின் Reporting Manager-ஐத் தேர்வுசெய்யுங்கள் (பலரைத் தேர்ந்தெடுத்து ஒரே முறையில் அமைக்கலாம்).'],
      ['Shift Master is the person\'s usual shift; Weekly off is their usual day off.',
        'Shift Master — அவரின் வழக்கமான ஷிஃப்ட்; Weekly off — வழக்கமான வார விடுமுறை நாள்.'],
      ['Tick Multi-unit for staff who punch at more than one unit.',
        'ஒன்றுக்கு மேற்பட்ட யூனிட்டில் பதிவு செய்யும் ஊழியர்களுக்கு Multi-unit-ஐக் குறியுங்கள்.'],
      ['"Create missing logins" gives new staff a sign-in (password = Staff Code).',
        '"Create missing logins" புதிய ஊழியர்களுக்கு உள்நுழைவு உருவாக்கும் (கடவுச்சொல் = ஸ்டாஃப் கோடு).'],
    ]),
    tips: list([
      ['Use "Inactive staff" to see people who have left; reactivate them from there.',
        'விலகியவர்களைப் பார்க்க "Inactive staff" பயன்படுத்துங்கள்; அங்கிருந்தே மீண்டும் செயல்படுத்தலாம்.'],
      ['Staff who report to the top administrator can choose him in the Reporting Manager list.',
        'உயர் நிர்வாகியிடம் நேரடியாக ரிப்போர்ட் செய்பவர்களுக்கு Reporting Manager பட்டியலில் அவரைத் தேர்வுசெய்யலாம்.'],
    ]),
  },

  'admin.masters.department': {
    title: t('Department Master', 'துறை மாஸ்டர்'),
    intro: t('The list of departments used in Staff Master and reports.',
      'ஸ்டாஃப் மாஸ்டர் மற்றும் அறிக்கைகளில் பயன்படும் துறைகளின் பட்டியல்.'),
    steps: list([
      ['Add a department with + Add department; rename it in the table.',
        '+ Add department மூலம் துறையைச் சேர்க்கலாம்; அட்டவணையிலேயே பெயரை மாற்றலாம்.'],
      ['Suspend a department you no longer use instead of deleting it — history stays.',
        'பயன்படுத்தாத துறையை நீக்குவதற்குப் பதில் Suspend செய்யுங்கள் — பழைய பதிவுகள் அப்படியே இருக்கும்.'],
    ]),
    tips: list([]),
  },
  'admin.masters.designation': {
    title: t('Designation Master', 'பதவி மாஸ்டர்'),
    intro: t('Job titles (Staff Nurse, DMO, Admin…). A shift can be limited to certain designations.',
      'பணிப் பதவிகள் (ஸ்டாஃப் நர்ஸ், DMO, அட்மின்…). ஒரு ஷிஃப்டை குறிப்பிட்ட பதவிகளுக்கு மட்டும் வரையறுக்கலாம்.'),
    steps: list([
      ['Add or rename designations here; suspend ones no longer used.',
        'பதவிகளை இங்கே சேர்க்கலாம் அல்லது பெயர் மாற்றலாம்; பயன்படாதவற்றை Suspend செய்யலாம்.'],
    ]),
    tips: list([]),
  },
  'admin.masters.unit': {
    title: t('Unit Master', 'யூனிட் மாஸ்டர்'),
    intro: t('The hospital units / branches. Every screen with a unit filter uses this list.',
      'மருத்துவமனை யூனிட்டுகள் / கிளைகள். யூனிட் வடிகட்டி உள்ள ஒவ்வொரு திரையும் இந்தப் பட்டியலைப் பயன்படுத்தும்.'),
    steps: list([
      ['Add a unit with + Add unit; each staff member belongs to one home unit.',
        '+ Add unit மூலம் யூனிட்டைச் சேர்க்கலாம்; ஒவ்வொரு ஊழியரும் ஒரு சொந்த யூனிட்டைச் சேர்ந்தவர்.'],
    ]),
    tips: list([]),
  },
  'admin.masters.holidays': {
    title: t('Holiday Calendar', 'விடுமுறை நாட்காட்டி'),
    intro: t('Declared holidays. A holiday has no attendance impact, whatever the punches show.',
      'அறிவிக்கப்பட்ட விடுமுறைகள். பதிவு எதுவாக இருந்தாலும் விடுமுறை நாள் வருகையைப் பாதிக்காது.'),
    steps: list([
      ['+ Add holiday: choose the date and name.',
        '+ Add holiday: தேதியும் பெயரும் தேர்வுசெய்யுங்கள்.'],
      ['Suspend a holiday to cancel it without losing the record.',
        'பதிவை இழக்காமல் ரத்து செய்ய விடுமுறையை Suspend செய்யுங்கள்.'],
    ]),
    tips: list([]),
  },
  'admin.masters.payroll': {
    title: t('Payroll Settings', 'சம்பள அமைப்புகள்'),
    intro: t('Rules for the whole payroll: pay cycle start day, CL and permission quotas, overtime, statutory deductions and the top administrator.',
      'முழு சம்பள முறைக்கான விதிகள்: பே சைக்கிள் தொடங்கும் நாள், CL மற்றும் பர்மிஷன் ஒதுக்கீடு, கூடுதல் நேரம் (OT), சட்டப்பூர்வ பிடித்தங்கள், உயர் நிர்வாகி.'),
    steps: list([
      ['Cycle start day sets the pay month (26 = 26th to 25th).',
        'Cycle start day சம்பள மாதத்தை அமைக்கும் (26 = 26 முதல் 25 வரை).'],
      ['Default CL per month and permission hours apply unless set per staff in Staff Master.',
        'மாதாந்திர CL மற்றும் பர்மிஷன் மணி நேரம் — ஸ்டாஃப் மாஸ்டரில் தனியாக அமைக்காவிட்டால் இவையே பொருந்தும்.'],
      ['"Show salary to staff" decides whether staff see their payslip.',
        '"Show salary to staff" ஊழியர்கள் தங்கள் சம்பளச் சீட்டைப் பார்க்கலாமா என்பதைத் தீர்மானிக்கும்.'],
      ['Top administrator: managers without a reporting manager report to this person.',
        'Top administrator: ரிப்போர்டிங் மேனேஜர் இல்லாத மேனேஜர்கள் இவரிடம் ரிப்போர்ட் செய்வார்கள்.'],
    ]),
    tips: list([
      ['Change these only with HR approval — they affect everyone\'s salary.',
        'HR ஒப்புதலுடன் மட்டுமே இவற்றை மாற்றுங்கள் — இவை அனைவரின் சம்பளத்தையும் பாதிக்கும்.'],
    ]),
  },

  'admin.shiftmaster': {
    title: t('Shift Master', 'ஷிஃப்ட் மாஸ்டர்'),
    intro: t('All shifts with their start and end time, badge letters and grace rules.',
      'அனைத்து ஷிஃப்டுகளும் — தொடக்க, முடிவு நேரம், பேட்ஜ் எழுத்து, சலுகை விதிகள்.'),
    steps: list([
      ['Allowed late = minutes always forgiven for that shift (grace).',
        'Allowed late = அந்த ஷிஃப்டுக்கு எப்போதும் மன்னிக்கப்படும் நிமிடங்கள் (சலுகை நேரம்).'],
      ['Allowed extra time / times per month = a further band forgiven only a few times a month.',
        'Allowed extra time / மாதத்திற்கு எத்தனை முறை = மாதத்தில் சில முறை மட்டும் மன்னிக்கப்படும் கூடுதல் நேரம்.'],
      ['Allowed designations limits a shift to certain job titles.',
        'Allowed designations ஒரு ஷிஃப்டை குறிப்பிட்ட பதவிகளுக்கு மட்டும் வரையறுக்கும்.'],
      ['Night shifts start at 17:00 or later; their OUT is the next morning.',
        'இரவு ஷிஃப்டுகள் மாலை 17:00 அல்லது அதற்குப் பிறகு தொடங்கும்; அவற்றின் OUT மறுநாள் காலை.'],
    ]),
    tips: list([
      ['Suspend a shift instead of deleting it so old attendance keeps its shift.',
        'பழைய வருகைப் பதிவுகள் தங்கள் ஷிஃப்டை இழக்காமல் இருக்க, ஷிஃப்டை நீக்காமல் Suspend செய்யுங்கள்.'],
    ]),
  },

  'admin.ledger': {
    title: t('Shift Ledger', 'ஷிஃப்ட் லெட்ஜர்'),
    intro: t('Attendance for everyone in the pay cycle, and the place to import the biometric files.',
      'பே சைக்கிளில் அனைவரின் வருகை; பயோமெட்ரிக் கோப்புகளை இறக்குமதி செய்யும் இடமும் இதுவே.'),
    steps: list([
      ['Import attendance: choose the day\'s device file (Unit 1 and Unit 2 separately). Both .xls exports are read.',
        'Import attendance: அன்றைய சாதனக் கோப்பைத் தேர்வுசெய்யுங்கள் (யூனிட் 1, யூனிட் 2 தனித்தனியாக). இரண்டு .xls வடிவங்களும் படிக்கப்படும்.'],
      ['Importing again is safe: punches from both units are combined (earliest IN, latest OUT).',
        'மீண்டும் இறக்குமதி செய்வது பாதுகாப்பானது: இரண்டு யூனிட்டின் பதிவுகளும் இணைக்கப்படும் (முதல் IN, கடைசி OUT).'],
      ['After each import, the Multi-unit check shows which unit\'s file is still missing for a day.',
        'ஒவ்வொரு இறக்குமதிக்குப் பிறகும், எந்த நாளுக்கு எந்த யூனிட் கோப்பு இன்னும் வரவில்லை என்பதை Multi-unit check காட்டும்.'],
      ['Click a staff member to see each day with its shift, lateness and deduction.',
        'ஒரு ஊழியரை அழுத்தினால் ஒவ்வொரு நாளின் ஷிஃப்ட், தாமதம், பிடித்தம் தெரியும்.'],
    ]),
    tips: list([
      ['Check daily: a WO on a worked day, an "Off after night duty" without a night, or a missing punch usually means the plan or a punch needs correcting.',
        'தினமும் சரிபாருங்கள்: வேலை செய்த நாளில் WO, இரவுப் பணி இல்லாமல் "Off after night duty", அல்லது விடுபட்ட பதிவு — பொதுவாக ஷிஃப்ட் திட்டம் அல்லது பதிவைச் சரிசெய்ய வேண்டும் என்று பொருள்.'],
    ]),
  },

  'admin.planner': {
    title: t('Shift Planner', 'ஷிஃப்ட் பிளானர்'),
    intro: t('Who works which shift on each day of the pay cycle. Attendance follows this plan.',
      'பே சைக்கிளின் ஒவ்வொரு நாளிலும் யார் எந்த ஷிஃப்டில் பணிபுரிகிறார்கள். வருகைக் கணக்கு இந்தத் திட்டத்தையே பின்பற்றும்.'),
    steps: list([
      ['Click a day from today onward to choose its shift or WO (weekly off).',
        'இன்று முதல் உள்ள ஒரு நாளை அழுத்தி அதன் ஷிஃப்ட் அல்லது WO (வார விடுமுறை)-ஐத் தேர்வுசெய்யுங்கள்.'],
      ['Plan a whole cycle at once: Export plan, fill in the days (one sheet per reporting manager), then Import plan.',
        'முழு சைக்கிளையும் ஒரே முறையில்: Export plan செய்து, நாட்களை நிரப்பி (ஒவ்வொரு ரிப்போர்டிங் மேனேஜருக்கும் ஒரு தாள்), பிறகு Import plan செய்யுங்கள்.'],
      ['Night duty: put NS / N2 / D3 on the date the night starts, and WO or their shift on the next day.',
        'இரவுப் பணி: இரவு தொடங்கும் தேதியில் NS / N2 / D3 இடுங்கள்; மறுநாள் WO அல்லது அவரின் ஷிஃப்டை இடுங்கள்.'],
      ['Day staff: plan their real day shift — a single evening punch is then read as their OUT, not a night.',
        'பகல் ஊழியர்கள்: அவர்களின் உண்மையான பகல் ஷிஃப்டைத் திட்டமிடுங்கள் — அப்போது மாலை ஒற்றைப் பதிவு இரவுப் பணியாக அல்ல, OUT-ஆகக் கருதப்படும்.'],
      ['The Weekly off column changes a person\'s regular weekly off from a date onward.',
        'Weekly off நெடுவரிசை ஒருவரின் வழக்கமான வார விடுமுறையை ஒரு தேதியிலிருந்து மாற்றும்.'],
    ]),
    tips: list([
      ['Blank days fall back to the Staff Master shift — keep every day planned for rotating staff.',
        'காலியான நாட்கள் ஸ்டாஃப் மாஸ்டர் ஷிஃப்டையே எடுக்கும் — சுழற்சி ஊழியர்களுக்கு ஒவ்வொரு நாளையும் திட்டமிடுங்கள்.'],
      ['Managers change their own staff from today onward; past days only administrators.',
        'மேனேஜர்கள் தங்கள் ஊழியர்களை இன்று முதல் மாற்றலாம்; கடந்த நாட்களை நிர்வாகிகள் மட்டுமே மாற்ற முடியும்.'],
      ['A finalized pay cycle is locked.',
        'இறுதிசெய்யப்பட்ட பே சைக்கிள் பூட்டப்படும்.'],
    ]),
  },

  'admin.tasks': {
    title: t('Tasks', 'பணிகள்'),
    intro: t('Assign work to staff and follow it until it is closed.',
      'ஊழியர்களுக்குப் பணிகளை ஒதுக்கி, அவை மூடப்படும் வரை பின்தொடருங்கள்.'),
    steps: list([
      ['+ Assign task: title, staff member, due date and priority. Templates fill common tasks quickly.',
        '+ Assign task: தலைப்பு, ஊழியர், கடைசி தேதி, முன்னுரிமை. அடிக்கடி வரும் பணிகளை Template விரைவாக நிரப்பும்.'],
      ['Status moves Open → Accepted → Review → Done / Closed. Rejected tasks need reassigning.',
        'நிலை: Open → Accepted → Review → Done / Closed. நிராகரிக்கப்பட்ட பணிகளை மீண்டும் ஒதுக்க வேண்டும்.'],
      ['Review a finished task, add a note and close it.',
        'முடிந்த பணியை மதிப்பாய்வு செய்து, குறிப்பு சேர்த்து மூடுங்கள்.'],
    ]),
    tips: list([]),
  },

  'admin.leave': {
    title: t('Leave & Permission', 'விடுப்பு & அனுமதி'),
    intro: t('All leave and permission requests, and the place to approve, reject or withdraw them.',
      'அனைத்து விடுப்பு / பர்மிஷன் கோரிக்கைகளும்; அனுமதிக்க, நிராகரிக்க, திரும்பப் பெற இதுவே இடம்.'),
    steps: list([
      ['Pending requests: Approve or Reject. An approved CL marks that day CL in attendance.',
        'நிலுவைக் கோரிக்கைகள்: Approve அல்லது Reject. அனுமதிக்கப்பட்ட CL அந்த நாளை வருகையில் CL எனக் குறிக்கும்.'],
      ['Withdraw approval: possible in the running or previous pay cycle (not in a finalized one); the day goes back as it was.',
        'Withdraw approval: நடப்பு அல்லது முந்தைய பே சைக்கிளில் மட்டும் (இறுதிசெய்யப்பட்டதில் அல்ல); அந்த நாள் முன்பு இருந்தபடியே திரும்பும்.'],
      ['+ Approved leave / week off for an absence: tick absent days of your staff and mark them as Approved leave (paid, no CL used) or Week off.',
        '+ Approved leave / week off for an absence: உங்கள் ஊழியர்களின் வராத நாட்களைத் தேர்ந்தெடுத்து Approved leave (சம்பளத்துடன், CL பயன்படாது) அல்லது Week off எனக் குறியுங்கள்.'],
      ['"Who\'s out / who\'s covering" lists today\'s and upcoming leave with the covering colleague.',
        '"Who\'s out / who\'s covering" இன்றைய மற்றும் வரவிருக்கும் விடுப்புகளையும், பணியைக் கவனிப்பவரையும் காட்டும்.'],
    ]),
    tips: list([
      ['Managers see only requests routed to them; administrators see all.',
        'மேனேஜர்கள் தங்களுக்கு அனுப்பப்பட்ட கோரிக்கைகளை மட்டுமே பார்ப்பார்கள்; நிர்வாகிகள் அனைத்தையும் பார்ப்பார்கள்.'],
    ]),
  },

  'admin.salary': {
    title: t('Salary', 'சம்பளம்'),
    intro: t('Salary for everyone in the pay cycle: gross, lateness / loss of pay, statutory deductions, overtime and net payable.',
      'பே சைக்கிளில் அனைவரின் சம்பளம்: மொத்தம், தாமதம் / சம்பள இழப்பு, சட்டப்பூர்வ பிடித்தங்கள், கூடுதல் நேரம், நிகரத் தொகை.'),
    steps: list([
      ['Check that both units\' attendance is imported for every day before finalizing.',
        'இறுதிசெய்வதற்கு முன் ஒவ்வொரு நாளுக்கும் இரண்டு யூனிட்டின் வருகையும் ஏற்றப்பட்டுள்ளதா எனச் சரிபாருங்கள்.'],
      ['Open a staff member for their payslip and one-time adjustments for this cycle.',
        'ஒரு ஊழியரைத் திறந்து அவரின் சம்பளச் சீட்டு மற்றும் இந்த சைக்கிளுக்கான ஒருமுறை மாற்றங்களைப் பாருங்கள்.'],
      ['Finalize the cycle to freeze payslips; reopen it only if a correction is needed.',
        'சம்பளச் சீட்டுகளை நிலைநிறுத்த சைக்கிளை Finalize செய்யுங்கள்; திருத்தம் தேவைப்பட்டால் மட்டுமே மீண்டும் திறங்கள்.'],
      ['Export the bank transfer file for the salary payment.',
        'சம்பளப் பணப் பரிமாற்றத்திற்கான வங்கிக் கோப்பை Export செய்யுங்கள்.'],
    ]),
    tips: list([
      ['After finalizing, attendance, shift plan and leave for that cycle are locked.',
        'இறுதிசெய்த பிறகு அந்த சைக்கிளின் வருகை, ஷிஃப்ட் திட்டம், விடுப்பு ஆகியவை பூட்டப்படும்.'],
    ]),
  },

  'admin.reports': {
    title: t('Reports', 'அறிக்கைகள்'),
    intro: t('Ready reports for the pay cycle, each downloadable as a CSV file for Excel.',
      'பே சைக்கிளுக்கான தயார் அறிக்கைகள்; ஒவ்வொன்றையும் Excel-க்கான CSV கோப்பாகப் பதிவிறக்கலாம்.'),
    steps: list([
      ['Choose a report: payroll register, attendance summary, leave use, lateness, overtime, tasks or staff master.',
        'அறிக்கையைத் தேர்வுசெய்யுங்கள்: சம்பளப் பதிவேடு, வருகைச் சுருக்கம், விடுப்புப் பயன்பாடு, தாமதம், கூடுதல் நேரம், பணிகள், ஊழியர் விவரம்.'],
      ['Press Export to download it.',
        'பதிவிறக்க Export அழுத்துங்கள்.'],
    ]),
    tips: list([]),
  },
};

/** Order of the printable help document. */
export const HELP_ORDER = [
  'about', 'login',
  'staff.overview', 'staff.ledger', 'staff.tasks', 'staff.leave', 'staff.payslip',
  'admin.overview', 'manager.overview', 'admin.staff',
  'admin.masters.department', 'admin.masters.designation', 'admin.masters.unit', 'admin.masters.holidays', 'admin.masters.payroll',
  'admin.shiftmaster', 'admin.ledger', 'admin.planner', 'admin.tasks', 'admin.leave', 'admin.salary', 'admin.reports',
];

/** Section headings of the printable document (before the first key of each group). */
export const HELP_GROUPS = [
  { before: 'about', title: t('The application', 'மென்பொருள்') },
  { before: 'staff.overview', title: t('For staff', 'ஊழியர்களுக்கு') },
  { before: 'admin.overview', title: t('For administrators and reporting managers', 'நிர்வாகிகள் மற்றும் ரிப்போர்டிங் மேனேஜர்களுக்கு') },
];

/**
 * The help entry for the screen in view.
 * ctx: { view: 'staff' | 'admin', signedIn, role: 'admin' | 'manager', adminTab, mastersSubTab, staffTab }
 */
export function helpKey(ctx) {
  const c = ctx || {};
  if (!c.signedIn) return 'login';
  if (c.view === 'admin') {
    if (c.adminTab === 'overview' && c.role === 'manager') return 'manager.overview';
    if (c.adminTab === 'masters') {
      const k = 'admin.masters.' + (c.mastersSubTab || 'department');
      return HELP[k] ? k : 'admin.masters.department';
    }
    const k = 'admin.' + (c.adminTab || 'overview');
    return HELP[k] ? k : 'about';
  }
  const k = 'staff.' + (c.staffTab || 'overview');
  return HELP[k] ? k : 'staff.overview';
}
