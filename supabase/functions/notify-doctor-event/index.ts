import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const inr = (n: unknown) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`

const istDate = (value: string | null | undefined) => {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

const titleCase = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method === 'GET') {
    return json({ ok: true, function: 'notify-doctor-event' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server configuration error' }, 500)
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const event = body?.event
  if (event !== 'visit_created' && event !== 'bank_advice_generated') {
    return json({ error: 'event must be visit_created or bank_advice_generated' }, 400)
  }

  // Resolve the doctor's login email; skip silently when there is none.
  const doctorEmail = async (doctor: any): Promise<string | null> => {
    if (!doctor?.user_id) return null
    const { data, error } = await supabase.auth.admin.getUserById(doctor.user_id)
    if (error) {
      console.error('Failed to resolve doctor email', { doctorId: doctor.id, error })
      return null
    }
    const email = data?.user?.email?.trim() ?? ''
    return EMAIL_RE.test(email) ? email : null
  }

  const send = async (
    templateName: string,
    recipientEmail: string,
    idempotencyKey: string,
    templateData: Record<string, unknown>
  ) => {
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: { templateName, recipientEmail, idempotencyKey, templateData },
    })
    if (error) {
      console.error('Send failed', { templateName, recipientEmail, error })
      return false
    }
    return true
  }

  try {
    if (event === 'visit_created') {
      const visitId = body?.visitId
      if (typeof visitId !== 'string' || !visitId) {
        return json({ error: 'visitId is required' }, 400)
      }

      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .select(
          'id, visit_code, visit_date, patient_name, patient_id, visit_reason, payment_type, visit_payment, doctor_id, insurance_company_id'
        )
        .eq('id', visitId)
        .maybeSingle()
      if (visitError || !visit) return json({ sent: false, reason: 'visit_not_found' })

      const { data: doctor } = await supabase
        .from('doctors')
        .select('id, full_name, user_id')
        .eq('id', visit.doctor_id)
        .maybeSingle()
      const email = await doctorEmail(doctor)
      if (!email) return json({ sent: false, reason: 'no_email' })

      let insuranceCompany = ''
      if (visit.insurance_company_id) {
        const { data: ins } = await supabase
          .from('insurance_companies')
          .select('name')
          .eq('id', visit.insurance_company_id)
          .maybeSingle()
        insuranceCompany = (ins as any)?.name ?? ''
      }

      const ok = await send('doctor-visit-recorded', email, `visit-created-${visit.id}`, {
        doctorName: doctor?.full_name ?? 'Doctor',
        visitCode: visit.visit_code ?? '',
        visitDate: istDate(visit.visit_date),
        patientName: visit.patient_name ?? '',
        patientId: visit.patient_id ?? '',
        visitReason: visit.visit_reason ? titleCase(visit.visit_reason) : '',
        paymentType: visit.payment_type ? titleCase(visit.payment_type) : '',
        insuranceCompany,
        amount: inr(visit.visit_payment),
      })
      return json({ sent: ok ? 1 : 0 })
    }

    // bank_advice_generated
    const paymentIds: string[] = Array.isArray(body?.paymentIds)
      ? body.paymentIds.filter((id: unknown) => typeof id === 'string')
      : []
    if (!paymentIds.length) return json({ sent: 0, reason: 'no_payments' })

    const reference = typeof body?.reference === 'string' ? body.reference : ''
    const mode = typeof body?.mode === 'string' ? titleCase(body.mode) : 'Bank'

    const { data: payments } = await supabase
      .from('payments')
      .select(
        'id, doctor_id, period_start, period_end, total_visits, gross_amount, tds_amount, net_amount, total_amount, bank_advice_generated_at'
      )
      .in('id', paymentIds)

    const byDoctor = new Map<string, any[]>()
    for (const p of payments ?? []) {
      if (!p.doctor_id) continue
      const list = byDoctor.get(p.doctor_id) ?? []
      list.push(p)
      byDoctor.set(p.doctor_id, list)
    }
    if (!byDoctor.size) return json({ sent: 0, reason: 'no_doctor_payments' })

    const { data: doctors } = await supabase
      .from('doctors')
      .select('id, full_name, user_id')
      .in('id', Array.from(byDoctor.keys()))

    let sent = 0
    let skipped = 0
    for (const [doctorId, rows] of byDoctor) {
      const doctor = (doctors ?? []).find((d: any) => d.id === doctorId)
      const email = await doctorEmail(doctor)
      if (!email) {
        skipped++
        continue
      }

      const sum = (key: string) =>
        rows.reduce((s: number, r: any) => s + (Number(r[key]) || 0), 0)
      const gross = sum('gross_amount') || sum('total_amount')
      const net = sum('net_amount') || gross - sum('tds_amount')
      const generatedOn = istDate(rows[0]?.bank_advice_generated_at ?? new Date().toISOString())

      const ok = await send(
        'doctor-bank-advice',
        email,
        `advice-${reference || generatedOn}-${doctorId}`,
        {
          doctorName: doctor?.full_name ?? 'Doctor',
          reference,
          generatedOn,
          paymentMode: mode,
          paymentCount: rows.length,
          grossAmount: inr(gross),
          tdsAmount: inr(sum('tds_amount')),
          netAmount: inr(net),
          rows: rows.map((r: any) => ({
            label:
              r.period_start && r.period_end
                ? `${istDate(r.period_start)} – ${istDate(r.period_end)}`
                : 'Payment',
            detail: r.total_visits ? `${r.total_visits} visits` : undefined,
            amount: inr(r.net_amount ?? r.total_amount),
          })),
        }
      )
      if (ok) sent++
    }

    return json({ sent, skipped })
  } catch (error) {
    console.error('notify-doctor-event failed', error)
    return json({ error: 'Notification failed' }, 500)
  }
})
