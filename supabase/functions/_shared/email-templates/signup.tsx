/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{token ? `${token} is your WestMed verification code` : 'Confirm your WestMed HMS account'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>WestMed Hospital</Text>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Your WestMed HMS account is ready for{' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          . Confirm your email to finish setting it up.
        </Text>
        {token ? (
          <Section style={codeBox}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
        ) : null}
        <Button style={button} href={confirmationUrl}>
          Confirm email
        </Button>
        <Text style={footer}>
          If you didn't create this account, you can safely ignore this email.{' '}
          <Link href={siteUrl} style={link}>
            WestMed HMS
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: 'hsl(140, 45%, 40%)', textDecoration: 'underline' }
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
