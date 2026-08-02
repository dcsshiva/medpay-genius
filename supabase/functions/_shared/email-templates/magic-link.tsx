/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{token ? `${token} is your WestMed login code` : 'Your WestMed login link'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>WestMed Hospital</Text>
        <Heading style={h1}>Your login code</Heading>
        <Text style={text}>
          Enter this code on the WestMed HMS login screen. It expires
          shortly, so use it soon.

        </Text>
        {token ? (
          <Section style={codeBox}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
        ) : null}
        <Text style={text}>Or log in directly:</Text>
        <Button style={button} href={confirmationUrl}>
          Log in to WestMed HMS
        </Button>
        <Text style={footer}>
          If you didn't request this code, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
const button = {
  backgroundColor: 'hsl(140, 45%, 50%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: 'hsl(155, 12%, 60%)', margin: '32px 0 0' }
