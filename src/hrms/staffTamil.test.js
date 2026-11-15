import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TA, translateText } from './staffTamil.js';

test('every phrase has Tamil', () => {
  for (const [en, ta] of Object.entries(TA)) assert.match(ta, /[஀-௿]/, en);
});

test('exact phrases, spaces kept, unknown text left alone', () => {
  assert.equal(translateText('Present days'), 'வந்த நாட்கள்');
  assert.equal(translateText(' present'), ' வருகை');
  assert.equal(translateText('Sign out'), 'வெளியேறு');
  assert.equal(translateText('SELVI'), null);
  assert.equal(translateText('₹18,677'), null);
  assert.equal(translateText('09:24'), null);
  assert.equal(translateText('Today · இன்று'), null);   // already has Tamil
});

test('patterns with numbers and names', () => {
  assert.equal(translateText('24m late - no approved permission, 24m deducted from pay'), '24 நிமி தாமதம் — அனுமதி இல்லை, 24 நிமி சம்பளத்தில் பிடித்தம்');
  assert.equal(translateText('7m late - inside the 10m grace for General Shift 2, no impact'), '7 நிமி தாமதம் — General Shift 2 சலுகை நேரம் 10 நிமிக்குள், பாதிப்பில்லை');
  assert.equal(translateText('Late 24m'), 'தாமதம் 24m');
  assert.equal(translateText('Reporting Manager: GOMATHY'), 'ரிப்போர்டிங் மேனேஜர்: GOMATHY');
});

test('text joined with · is translated part by part', () => {
  assert.equal(translateText('Staff Code 2100302 · Staff Nurse · Nursing · UNIT 1'), 'ஸ்டாஃப் கோடு 2100302 · Staff Nurse · Nursing · UNIT 1');
  assert.equal(translateText('Unplanned absence - loss of pay · Missing OUT punch — counted present'),
    'முன்அறிவிப்பில்லா விடுமுறை — சம்பள இழப்பு · OUT பதிவு இல்லை — வருகையாகக் கணக்கிடப்பட்டது');
});
