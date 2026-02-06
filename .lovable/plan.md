

## Add "Sender To Receiver Info" Field to GEFU File Generation

### Overview
Add the "Sender To Rcvr Info" field to the GEFU bank advice file format. This field (max 35 alphanumeric characters) will contain a descriptive message about the payment purpose. Additionally, restrict the Quick Payment "Payment Notes" field to 35 characters since it feeds into this GEFU field.

---

### Current GEFU D-Line Structure (22 fields)

```text
D~TxnCode~HospAcct~HospName~Addr1~Addr2~Addr3~IFSC~BeneAcct~BeneName~''~''~''~''~Seq~Date~Amount~Seq~''~''~''~''
                                                                                                    ↑
                                                                              Field 18: Currently second sequence number
                                                                              Should be: "Sender To Rcvr Info"
```

### Updated GEFU D-Line Structure

```text
D~TxnCode~HospAcct~HospName~Addr1~Addr2~Addr3~IFSC~BeneAcct~BeneName~''~''~''~''~Seq~Date~Amount~SenderToRcvrInfo~''~''~''~''
                                                                                                   ↑
                                                                              Field 18: Now contains payment message
```

### Message Logic

| Payment Type | Sender To Rcvr Info Value |
|---|---|
| **Doctor Payment** (cash or insurance) | `CONSULTING CHARGES` |
| **Quick Payment** (with notes) | `payment_notes` (max 35 chars, alphanumeric) |
| **Quick Payment** (without notes) | Payment type name (e.g., `VENDOR PAYMENT`, `PATIENT REFUND`) |
| **Staff Payment** | `STAFF PAYMENT` |

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/BankAdviceGeneration.tsx` | Update GEFU D-line field 18 with sender-to-receiver info based on payment type |
| `src/components/BankAdviceGenerationBeta.tsx` | Update GEFU generation to include sender-to-receiver info |
| `src/components/PaymentManagement.tsx` | Update GEFU D-line field 18 with `CONSULTING CHARGES` for doctor payments |
| `src/components/QuickPaymentManagement.tsx` | (1) Update GEFU D-line field 18 with payment notes or type name, (2) Restrict payment_notes field to 35 characters |
| `src/components/quick-payment/StaffBulkPaymentTab.tsx` | Update GEFU D-line field 18 with `STAFF PAYMENT` |
| `src/components/BankAdviceReports.tsx` | Update all regeneration logic (doctor, quick, staff) with sender-to-receiver info |
| `src/components/bank-advice-beta/BetaGeneratedAdviceTab.tsx` | Update regeneration GEFU with sender-to-receiver info |
| `src/components/quick-payment/StaffPaymentHistoryTab.tsx` | Update staff payment GEFU regeneration with sender-to-receiver info |

---

### Detailed Changes

#### 1. Quick Payment Notes Field - Character Limit (QuickPaymentManagement.tsx)

Change the Payment Notes `Textarea` to an `Input` with `maxLength={35}` and add a character counter:

```typescript
<div>
  <Label htmlFor="payment_notes">Payment Notes (max 35 characters)</Label>
  <Input
    id="payment_notes"
    value={formData.payment_notes}
    onChange={(e) => setFormData({ ...formData, payment_notes: e.target.value })}
    placeholder="Optional notes (used in bank advice)"
    maxLength={35}
  />
  <p className="text-xs text-muted-foreground mt-1">
    {formData.payment_notes.length}/35 characters - Used as Sender to Receiver info in GEFU file
  </p>
</div>
```

#### 2. GEFU D-Line Update - BankAdviceGeneration.tsx (Unified)

In `handlePaymentModeConfirm`, update the D-line generation at line ~457:

```typescript
// Determine sender-to-receiver info based on payment type
let senderToRcvrInfo = '';
if (payment.source_table === 'payments') {
  senderToRcvrInfo = 'CONSULTING CHARGES';
} else if (payment.source_table === 'quick_payments') {
  const notes = payment.reference_info?.payment_notes;
  if (notes && notes.trim().length > 0) {
    senderToRcvrInfo = notes.trim().substring(0, 35);
  } else {
    senderToRcvrInfo = (payment.payment_type_name || 'PAYMENT').toUpperCase().substring(0, 35);
  }
}

// Replace field 18 (was second seq) with senderToRcvrInfo
gefuContent += `D~N06~${hospitalAccount}~${hospitalName}~${address1}~${address2}~${address3}~${payment.ifsc_code}~${payment.bank_account_number}~${payment.account_holder_name}~~~~~${seq}~${dd}/${mm}/20${yy}~${netAmount}~${sanitize(senderToRcvrInfo)}~~~~\n`;
```

#### 3. GEFU D-Line Update - PaymentManagement.tsx (Doctor Payments)

Update the detail line array at line ~1771-1794, changing field index 17 (position 18) from `index + 1` to `'CONSULTING CHARGES'`:

```typescript
const detailLine = [
  'D', transactionCode,
  hospAccount, 'Westmed Healthcare Pvt Ltd',
  'ADDRESS1', 'ADDRESS2', 'ADDRESS3',
  doctor.ifsc_code || '', doctor.bank_account_number,
  doctor.account_holder_name,
  '', '', '', '',
  index + 1, dateStr, amount,
  'CONSULTING CHARGES',  // ← Was: index + 1
  '', '', '', ''
].join('~');
```

#### 4. GEFU D-Line Update - QuickPaymentManagement.tsx

Update the detail line at line ~599-607, changing field 18 to payment notes or type name:

```typescript
const senderToRcvrInfo = payment.payment_notes?.trim()
  ? payment.payment_notes.trim().substring(0, 35)
  : (payment.quick_payment_types?.type_name || 'PAYMENT').toUpperCase().substring(0, 35);

const detailLine = [
  'D', 'N06',
  hospAccount, hospName,
  'ADDRESS1', 'ADDRESS2', 'ADDRESS3',
  payment.ifsc_code || '', payment.account_number || '',
  payment.account_holder_name || payment.name,
  '', '', '', '', index + 1, dateStr, netAmount,
  senderToRcvrInfo,  // ← Was: index + 1
  '', '', '', ''
].join('~');
```

#### 5. GEFU D-Line Update - StaffBulkPaymentTab.tsx

Update the detail line at line ~293-309, changing field 18:

```typescript
const detailLine = [
  'D', 'N06', hospAcc, hospName,
  'ADDRESS1', 'ADDRESS2', 'ADDRESS3',
  staff.ifsc_code, staff.bank_account_number,
  staff.account_holder_name || staff.full_name,
  '', '', '', '',
  (index + 1).toString(), dateStr, amount.toFixed(2),
  'STAFF PAYMENT',  // ← Was: (index + 1).toString()
  '', '', '', ''
].join('~');
```

#### 6. Regeneration Logic Updates

All regeneration functions in `BankAdviceReports.tsx`, `BetaGeneratedAdviceTab.tsx`, and `StaffPaymentHistoryTab.tsx` will be updated similarly:

- **Doctor payment regeneration** (line 746): Add `CONSULTING CHARGES` in field 18
- **Quick payment regeneration** (line 790): Fetch and use `payment_notes` or payment type
- **Staff payment regeneration** (line 853-869): Add `STAFF PAYMENT` in field 18

#### 7. BankAdviceGenerationBeta.tsx - Simplified GEFU

The Beta component at lines 196-213 uses a completely different format. This will be updated to match the standard GEFU format with proper fields including the sender-to-receiver info.

---

### Sanitization

All sender-to-receiver info values will be sanitized before inclusion in the GEFU file:
- Remove tildes (`~`) and newlines
- Trim to max 35 characters
- Convert to uppercase for consistency
- Keep only alphanumeric characters and spaces

```typescript
const sanitizeSenderInfo = (val: string): string => {
  return val
    .replace(/[~\r\n]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .substring(0, 35)
    .toUpperCase();
};
```

---

### Data Flow

```text
Payment Created
     │
     ├── Doctor Payment → senderToRcvrInfo = "CONSULTING CHARGES"
     │
     ├── Quick Payment
     │    ├── Has notes (max 35 chars) → senderToRcvrInfo = payment_notes
     │    └── No notes → senderToRcvrInfo = payment_type_name (e.g., "VENDOR PAYMENT")
     │
     └── Staff Payment → senderToRcvrInfo = "STAFF PAYMENT"
     │
     ▼
GEFU File Generated
     │
     ▼
D~N06~...~Amount~[SENDER TO RCVR INFO]~...
```

