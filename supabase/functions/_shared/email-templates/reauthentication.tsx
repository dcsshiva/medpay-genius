/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{token} is your WestMed verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>WestMed Hospital</Text>
        <Heading style={h1}>Confirm your identity</Heading>
        <Text style={text}>Enter this code in WestMed HMS to continue:</Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{token}</Text>
        </Section>
        <Text style={footer}>
          This code expires shortly. If you didn't request it, you can safely
          ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '560px' }
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
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(155, 12%, 45%)',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const codeBox = {
  backgroundColor: 'hsl(150, 25%, 95%)',
  border: '1px solid hsl(140, 45%, 80%)',
  borderRadius: '8px',
  padding: '16px 20px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  letterSpacing: '8px',
  fontWeight: 'bold' as const,
  color: 'hsl(140, 45%, 35%)',
  margin: '0',
}
const footer = { fontSize: '12px', color: 'hsl(155, 12%, 60%)', margin: '32px 0 0' }
