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

interface AdviceRow {
  label: string
  detail?: string
  amount?: string
}

interface DoctorBankAdviceProps {
  doctorName?: string
  reference?: string
  generatedOn?: string
  paymentMode?: string
  paymentCount?: number
  grossAmount?: string
  tdsAmount?: string
  netAmount?: string
  rows?: AdviceRow[]
}

const DoctorBankAdviceEmail = ({
  doctorName = 'Doctor',
  reference = '',
  generatedOn = '',
  paymentMode = 'Bank',
  paymentCount = 0,
  grossAmount = '',
  tdsAmount = '',
  netAmount = '',
  rows = [],
}: DoctorBankAdviceProps) => {
  const summary: Array<[string, string]> = [
    ['Reference', reference || '—'],
    ['Generated on', generatedOn || '—'],
    ['Payment mode', paymentMode || '—'],
    ['Payments included', String(paymentCount ?? 0)],
    ['Gross amount', grossAmount || '—'],
    ['TDS', tdsAmount || '—'],
    ['Net payable', netAmount || '—'],
  ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Payment advice generated${reference ? ` — ${reference}` : ''}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>WestMed Hospital</Text>
          <Heading style={h1}>Payment advice generated</Heading>
          <Text style={text}>
            Dear {doctorName}, a payment advice has been generated for your account in
            WestMed HMS.
          </Text>
          <Section style={sectionBox}>
            {summary.map(([label, value]) => (
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
          {rows.length ? (
            <Section style={sectionBox}>
              <Text style={sectionTitle}>Payments included</Text>
              {rows.map((row, i) => (
                <Row key={i} style={rowStyle}>
                  <Column>
                    <Text style={rowLabel}>{row.label}</Text>
                    {row.detail ? <Text style={rowDetail}>{row.detail}</Text> : null}
                  </Column>
                  <Column align="right">
                    <Text style={rowValue}>{row.amount ?? ''}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          ) : null}
          <Text style={footer}>
            This is an automated notification from WestMed HMS. Credit timing depends on
            your bank's processing.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DoctorBankAdviceEmail,
  subject: (data: Record<string, any>) =>
    `Payment advice generated${data?.reference ? ` — ${data.reference}` : ''} · WestMed HMS`,
  displayName: 'Doctor — bank advice generated',
  previewData: {
    doctorName: 'Dr. Arulmani',
    reference: '080826-3.txt',
    generatedOn: '08 Aug 2026',
    paymentMode: 'Bank',
    paymentCount: 2,
    grossAmount: '₹50,000',
    tdsAmount: '₹5,000',
    netAmount: '₹45,000',
    rows: [
      { label: '01 Aug 2026 – 07 Aug 2026', detail: '12 visits', amount: '₹27,000' },
      { label: '08 Jul 2026 – 31 Jul 2026', detail: '8 visits', amount: '₹18,000' },
    ],
  },
} satisfies TemplateEntry

export default DoctorBankAdviceEmail

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
const sectionTitle = {
  fontSize: '15px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 20%, 20%)',
  margin: '10px 0 4px',
}
const rowStyle = { borderTop: '1px solid hsl(140, 30%, 92%)' }
const rowLabel = { fontSize: '13px', color: 'hsl(155, 12%, 50%)', margin: '10px 0 2px' }
const rowDetail = { fontSize: '12px', color: 'hsl(155, 12%, 60%)', margin: '0 0 8px' }
const rowValue = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 20%, 25%)',
  margin: '10px 0',
}
const footer = { fontSize: '12px', color: 'hsl(155, 12%, 60%)', margin: '28px 0 0' }
