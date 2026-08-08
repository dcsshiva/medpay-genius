import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'



const inr = (n: number) =>
  `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`

const istTime = (iso: string | null) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  let hours = 24
  let testRecipient: string | null = null
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      if (typeof body?.hours === 'number' && body.hours > 0 && body.hours <= 168) {
        hours = body.hours
      }
      if (typeof body?.testRecipient === 'string') testRecipient = body.testRecipient
    } catch {
      // no body — use defaults
    }
  }

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const periodLabel = `${istTime(since)} – ${istTime(new Date().toISOString())} IST`

  const sections: any[] = []
  const pushSection = (
    title: string,
    rows: any[] | null,
    total: number | null,
    mapRow: (r: any) => any
  ) => {
    if (!rows?.length) return
    sections.push({
      title,
      count: rows.length,
      total: total !== null ? inr(total) : undefined,
      rows: rows.map(mapRow),
    })
  }

  // Doctor lookup for readable names
  const { data: doctors } = await supabase.from('doctors').select('id, name')
  const doctorName = (id: string | null) =>
    doctors?.find((d: any) => d.id === id)?.name ?? 'Unknown doctor'

  // 1. New visits
  const { data: visits } = await supabase
    .from('visits')
    .select('visit_code, patient_name, doctor_id, visit_payment, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  pushSection(
    'New visits recorded',
    visits,
    (visits ?? []).reduce((s: number, v: any) => s + (Number(v.visit_payment) || 0), 0),
    (v) => ({
      label: `${v.visit_code ?? 'Visit'} · ${v.patient_name ?? '—'}`,
      detail: doctorName(v.doctor_id),
      amount: inr(v.visit_payment),
      date: istTime(v.created_at),
    })
  )

  // 2. Doctor payments created
  const { data: payments } = await supabase
    .from('payments')
    .select('doctor_id, total_amount, net_amount, status, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  pushSection(
    'Doctor payments created',
    payments,
    (payments ?? []).reduce((s: number, p: any) => s + (Number(p.total_amount) || 0), 0),
    (p) => ({
      label: doctorName(p.doctor_id),
      detail: `Status: ${p.status}`,
      amount: inr(p.total_amount),
      date: istTime(p.created_at),
    })
  )

  // 3. Approvals (manager + admin)
  const { data: mgrApproved } = await supabase
    .from('payments')
    .select('doctor_id, total_amount, manager_approved_at')
    .gte('manager_approved_at', since)
    .order('manager_approved_at', { ascending: false })
  pushSection(
    'Manager approvals',
    mgrApproved,
    (mgrApproved ?? []).reduce((s: number, p: any) => s + (Number(p.total_amount) || 0), 0),
    (p) => ({
      label: doctorName(p.doctor_id),
      amount: inr(p.total_amount),
      date: istTime(p.manager_approved_at),
    })
  )

  const { data: admApproved } = await supabase
    .from('payments')
    .select('doctor_id, total_amount, admin_approved_at')
    .gte('admin_approved_at', since)
    .order('admin_approved_at', { ascending: false })
  pushSection(
    'Admin approvals',
    admApproved,
    (admApproved ?? []).reduce((s: number, p: any) => s + (Number(p.total_amount) || 0), 0),
    (p) => ({
      label: doctorName(p.doctor_id),
      amount: inr(p.total_amount),
      date: istTime(p.admin_approved_at),
    })
  )

  // 4. Quick payments
  const { data: quick } = await supabase
    .from('quick_payments')
    .select('name, net_amount, gross_amount, payment_mode, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  pushSection(
    'Quick payments created',
    quick,
    (quick ?? []).reduce((s: number, q: any) => s + (Number(q.net_amount) || 0), 0),
    (q) => ({
      label: q.name ?? '—',
      detail: q.payment_mode ? `Mode: ${q.payment_mode}` : undefined,
      amount: inr(q.net_amount),
      date: istTime(q.created_at),
    })
  )

  // 5. Staff payments
  const { data: staffPay } = await supabase
    .from('staff_payments')
    .select('account_holder_name, amount, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  pushSection(
    'Staff payments created',
    staffPay,
    (staffPay ?? []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0),
    (p) => ({
      label: p.account_holder_name ?? 'Staff payment',
      amount: inr(p.amount),
      date: istTime(p.created_at),
    })
  )

  // 6. Part payments / releases
  const { data: releases } = await supabase
    .from('payment_releases')
    .select('release_number, net_amount, release_status, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  pushSection(
    'Part payments / releases',
    releases,
    (releases ?? []).reduce((s: number, r: any) => s + (Number(r.net_amount) || 0), 0),
    (r) => ({
      label: `Release #${r.release_number}`,
      detail: `Status: ${r.release_status}`,
      amount: inr(r.net_amount),
      date: istTime(r.created_at),
    })
  )

  // 7. Bank advices generated (three sources)
  const adviceSources: Array<[string, string, string]> = [
    ['bank_advice_history', 'total_amount', 'Doctor'],
    ['quick_payment_bank_advice_history', 'total_net_amount', 'Quick payment'],
    ['staff_payment_bank_advice_history', 'total_amount', 'Staff payment'],
  ]
  const adviceRows: any[] = []
  let adviceTotal = 0
  for (const [table, amountCol, label] of adviceSources) {
    const { data } = await supabase
      .from(table)
      .select(`filename, payment_count, ${amountCol}, created_at`)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
    for (const row of data ?? []) {
      const amt = Number((row as any)[amountCol]) || 0
      adviceTotal += amt
      adviceRows.push({
        label: `${label} advice`,
        detail: `${(row as any).filename ?? ''} · ${(row as any).payment_count ?? 0} payments`,
        amount: inr(amt),
        date: istTime((row as any).created_at),
      })
    }
  }
  if (adviceRows.length) {
    sections.push({
      title: 'Bank advices generated',
      count: adviceRows.length,
      total: inr(adviceTotal),
      rows: adviceRows.slice(0, MAX_ROWS_PER_SECTION),
    })
  }

  // 8. Reversals / undo
  const { data: reverts } = await supabase
    .from('bank_advice_revert_log')
    .select('filename, payment_source, total_amount, reason, reverted_at')
    .gte('reverted_at', since)
    .order('reverted_at', { ascending: false })
  pushSection(
    'Reversals / undo actions',
    reverts,
    (reverts ?? []).reduce((s: number, r: any) => s + (Number(r.total_amount) || 0), 0),
    (r) => ({
      label: `${r.payment_source ?? 'Advice'} reverted`,
      detail: r.reason ?? r.filename ?? undefined,
      amount: inr(r.total_amount),
      date: istTime(r.reverted_at),
    })
  )

  // Recipients
  let recipients: string[] = []
  if (testRecipient) {
    recipients = [testRecipient]
  } else {
    const { data: recs } = await supabase
      .from('email_notification_recipients')
      .select('email')
      .eq('is_active', true)
      .eq('digest_enabled', true)
    recipients = (recs ?? []).map((r: any) => r.email)
  }

  if (!sections.length && !testRecipient) {
    console.log('No activity in period — digest skipped')
    return new Response(JSON.stringify({ sent: 0, reason: 'no_activity' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const dayKey = new Date().toISOString().slice(0, 10)
  let sent = 0
  const errors: string[] = []

  for (const email of recipients) {
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'daily-ops-digest',
        recipientEmail: email,
        idempotencyKey: testRecipient
          ? `ops-digest-test-${crypto.randomUUID()}`
          : `ops-digest-${dayKey}-${email}`,
        templateData: { periodLabel, sections },
      },
    })
    if (error) {
      console.error('Digest send failed', { email, error })
      errors.push(`${email}: ${error.message}`)
    } else {
      sent++
    }
  }

  return new Response(JSON.stringify({ sent, recipients: recipients.length, errors }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
