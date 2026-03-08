

# Fix TDS Certificate Generator — Null Date Safety

## Issue Found

In `TDSCertificateGenerator.tsx` line 242, when building the PDF table data, the code does:
```ts
format(new Date(payment.bank_advice_generated_at), 'dd/MM/yyyy')
```
If `bank_advice_generated_at` is null (which the DB schema allows), this crashes with "Invalid Date".

## Fix

**`src/components/TDSCertificateGenerator.tsx`** — Add null-safe date formatting in the table data mapping (line 242):

```ts
format(
  new Date(payment.bank_advice_generated_at || payment.period_end),
  'dd/MM/yyyy'
)
```

This falls back to `period_end` if the bank advice timestamp is missing, which is a reasonable fallback since the payment period end date is always present.

Everything else in the TDS system (RPC function, quarter calculations, Excel exports, certificate numbering, RLS policies) is working correctly.

