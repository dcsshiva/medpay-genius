/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

import type { TemplateEntry } from './registry.ts'

interface DoctorVisitRecordedProps {
  doctorName?: string
  visitCode?: string
  visitDate?: string
  patientName?: string
  patientId?: string
  visitReason?: string
  paymentType?: string
  insuranceCompany?: string
  amount?: string
}

const DoctorVisitRecordedEmail = ({
  doctorName = 'Doctor',
  visitCode = '',
  visitDate = '',
  patientName = '',
  patientId = '',
  visitReason = '',
  paymentType = '',
  insuranceCompany = '',
  amount = '',
}: DoctorVisitRecordedProps) => {
  const rows: Array<[string, string]> = [
    ['Visit code', visitCode || '—'],
    ['Visit date', visitDate || '—'],
    ['Patient', patientName || '—'],
    ['Patient ID', patientId || '—'],
    ['Reason', visitReason || '—'],
    [
      'Payment type',
      insuranceCompany ? `${paymentType} · ${insuranceCompany}` : paymentType || '—',
    ],
    ['Amount', amount || '—'],
  ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`New visit recorded${visitCode ? ` — ${visitCode}` : ''}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>WestMed Hospital</Text>
          <Heading style={h1}>New visit recorded</Heading>
          <Text style={text}>
            Dear {doctorName}, a new visit has been recorded against your profile in
            WestMed HMS.
          </Text>
          <Section style={sectionBox}>
            {rows.map(([label, value]) => (
              <Row key={label} style={rowStyle}>
                <Column>
                  <Text style={rowLabel}>{label}</Text>
                </Column>
                <Column align="right">
                  <Text style={rowValue}>{value}</Text>
                </Column>
              </Row>
            ))}
          </Section>
          <Text style={footer}>
            This is an automated notification from WestMed HMS. The amount shown is
            subject to the usual approval and payment process.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DoctorVisitRecordedEmail,
  subject: (data: Record<string, any>) =>
    `New visit recorded${data?.visitCode ? ` — ${data.visitCode}` : ''} · WestMed HMS`,
  displayName: 'Doctor — new visit recorded',
  previewData: {
    doctorName: 'Dr. Arulmani',
    visitCode: 'V-10231',
    visitDate: '08 Aug 2026',
    patientName: 'Ramesh K',
    patientId: 'P-4412',
    visitReason: 'Regular checkup',
    paymentType: 'Insurance',
    insuranceCompany: 'Star Health',
    amount: '₹4,500',
  },
} satisfies TemplateEntry

export default DoctorVisitRecordedEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '600px' }
const brand = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  color: 'hsl(140, 45%, 40%)',
  margin: '0 0 16px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 20%, 20%)',
  margin: '0 0 12px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(155, 12%, 45%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const sectionBox = {
  border: '1px solid hsl(140, 45%, 85%)',
  borderRadius: '8px',
  padding: '4px 16px 10px',
  margin: '0 0 14px',
  backgroundColor: 'hsl(150, 25%, 98%)',
}
const rowStyle = { borderTop: '1px solid hsl(140, 30%, 92%)' }
const rowLabel = { fontSize: '13px', color: 'hsl(155, 12%, 50%)', margin: '10px 0' }
const rowValue = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 20%, 25%)',
  margin: '10px 0',
}
const footer = { fontSize: '12px', color: 'hsl(155, 12%, 60%)', margin: '28px 0 0' }
