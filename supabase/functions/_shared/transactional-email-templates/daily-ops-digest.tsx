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

interface DigestRow {
  label: string
  detail?: string
  amount?: string
  date?: string
}

interface DigestSection {
  title: string
  count: number
  total?: string
  rows?: DigestRow[]
}

interface DailyOpsDigestProps {
  periodLabel?: string
  sections?: DigestSection[]
}

const formatSection = (section: DigestSection) => (
  <Section key={section.title} style={sectionBox}>
    <Row>
      <Column>
        <Text style={sectionTitle}>{section.title}</Text>
      </Column>
      <Column align="right">
        <Text style={sectionCount}>
          {section.count}
          {section.total ? ` · ${section.total}` : ''}
        </Text>
      </Column>
    </Row>
    {(section.rows ?? []).map((row, i) => (
      <Row key={i} style={rowStyle}>
        <Column>
          <Text style={rowLabel}>{row.label}</Text>
          {row.detail ? <Text style={rowDetail}>{row.detail}</Text> : null}
        </Column>
        <Column align="right">
          {row.amount ? <Text style={rowAmount}>{row.amount}</Text> : null}
          {row.date ? <Text style={rowDate}>{row.date}</Text> : null}
        </Column>
      </Row>
    ))}
  </Section>
)

const DailyOpsDigestEmail = ({
  periodLabel = 'the last 24 hours',
  sections = [],
}: DailyOpsDigestProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`WestMed HMS activity summary for ${periodLabel}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>WestMed Hospital</Text>
        <Heading style={h1}>Daily activity summary</Heading>
        <Text style={text}>
          Here is what was recorded in WestMed HMS for {periodLabel}.
        </Text>
        {sections.length === 0 ? (
          <Text style={text}>No activity was recorded in this period.</Text>
        ) : (
          sections.map(formatSection)
        )}
        <Text style={footer}>
          This is an automated summary from WestMed HMS. Figures are indicative —
          always confirm details inside the application.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DailyOpsDigestEmail,
  subject: (data: Record<string, any>) =>
    `WestMed HMS daily summary — ${data?.periodLabel ?? 'last 24 hours'}`,
  displayName: 'Daily operations digest',
  previewData: {
    periodLabel: '7 Aug 2026',
    sections: [
      {
        title: 'New visits',
        count: 12,
        total: '₹48,500',
        rows: [
          { label: 'V-10231 · Ramesh K', detail: 'Dr. Arulmani', amount: '₹4,500', date: '09:12' },
          { label: 'V-10232 · Latha S', detail: 'Dr. Deepan', amount: '₹3,200', date: '10:40' },
        ],
      },
      {
        title: 'Payments created',
        count: 5,
        total: '₹22,000',
        rows: [{ label: 'Cash payment · Dr. Arulmani', amount: '₹8,000', date: '11:05' }],
      },
      { title: 'Approvals', count: 3 },
      { title: 'Bank advices generated', count: 1, total: '₹15,000' },
    ],
  },
} satisfies TemplateEntry

export default DailyOpsDigestEmail

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
  padding: '14px 16px',
  margin: '0 0 14px',
  backgroundColor: 'hsl(150, 25%, 98%)',
}
const sectionTitle = {
  fontSize: '15px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 20%, 20%)',
  margin: '0 0 6px',
}
const sectionCount = {
  fontSize: '15px',
  fontWeight: 'bold' as const,
  color: 'hsl(140, 45%, 35%)',
  margin: '0 0 6px',
}
const rowStyle = { borderTop: '1px solid hsl(140, 30%, 92%)' }
const rowLabel = { fontSize: '13px', color: 'hsl(160, 20%, 25%)', margin: '8px 0 0' }
const rowDetail = { fontSize: '12px', color: 'hsl(155, 12%, 55%)', margin: '2px 0 8px' }
const rowAmount = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 20%, 25%)',
  margin: '8px 0 0',
}
const rowDate = { fontSize: '12px', color: 'hsl(155, 12%, 55%)', margin: '2px 0 8px' }
const moreNote = { fontSize: '12px', color: 'hsl(155, 12%, 55%)', margin: '10px 0 0' }
const footer = { fontSize: '12px', color: 'hsl(155, 12%, 60%)', margin: '28px 0 0' }
