/**
 * Payment Failed Email Template
 *
 * Sent to: Users when payment fails
 * From: support@synaptic.study
 * Reply-to: support@synaptic.study
 * Trigger: Stripe webhook invoice.payment_failed
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from '@react-email/components'
import * as React from 'react'

interface PaymentFailedEmailProps {
  userName?: string
  amountDue: number // in cents
  currency: string
  planName: string
  retryDate?: string
  updatePaymentUrl: string
  failureReason?: string
}

export default function PaymentFailedEmail({
  userName = 'there',
  amountDue,
  currency = 'usd',
  planName,
  retryDate,
  updatePaymentUrl,
  failureReason,
}: PaymentFailedEmailProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountDue / 100)

  return (
    <Html>
      <Head />
      <Preview>Action Required: Payment Failed for Synaptic Subscription</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={alertBox}>
            <Heading style={h1}>Payment Issue</Heading>
          </Section>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            We tried to process your payment for Synaptic, but it didn't go through. Don't
            worry—this happens sometimes!
          </Text>

          <Section style={detailsSection}>
            <table style={table}>
              <tbody>
                <tr>
                  <td style={labelCell}>Plan:</td>
                  <td style={valueCell}>{planName}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Amount Due:</td>
                  <td style={valueCell}>
                    <strong>{formattedAmount}</strong>
                  </td>
                </tr>
                {failureReason && (
                  <tr>
                    <td style={labelCell}>Reason:</td>
                    <td style={valueCell}>{failureReason}</td>
                  </tr>
                )}
                {retryDate && (
                  <tr>
                    <td style={labelCell}>Next Retry:</td>
                    <td style={valueCell}>{retryDate}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          <Section style={warningSection}>
            <Heading style={h2}>What This Means:</Heading>
            <ul style={list}>
              <li style={listItem}>
                Your subscription is still active, but may be canceled if payment continues to fail
              </li>
              <li style={listItem}>
                We'll automatically retry the payment in a few days
              </li>
              <li style={listItem}>
                You can update your payment method now to avoid any interruption
              </li>
            </ul>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={updatePaymentUrl}>
              Update Payment Method
            </Button>
          </Section>

          <Section style={helpSection}>
            <Heading style={h2}>Common Causes:</Heading>
            <Text style={text}>
              • Insufficient funds
              <br />
              • Expired card
              <br />
              • Card declined by bank
              <br />
              • Incorrect billing information
              <br />• Bank security restrictions
            </Text>
          </Section>

          <Text style={text}>
            If you're having trouble updating your payment method or have questions, please contact
            us at{' '}
            <Link href="mailto:support@synaptic.study" style={link}>
              support@synaptic.study
            </Link>{' '}
            and we'll help you right away.
          </Text>

          <Text style={footer}>
            Thanks for being a Synaptic user!
            <br />
            The Synaptic Team
          </Text>

          <Text style={smallText}>
            You can manage your subscription and payment methods from your{' '}
            <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`} style={link}>
              dashboard
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const alertBox = {
  backgroundColor: '#fef2f2',
  borderLeft: '4px solid #ef4444',
  padding: '16px 40px',
}

const h1 = {
  color: '#dc2626',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
}

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '24px 0 16px',
  padding: '0 40px',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
  marginTop: '24px',
}

const detailsSection = {
  padding: '24px 0',
  backgroundColor: '#f9fafb',
  marginTop: '24px',
}

const table = {
  width: '100%',
  padding: '0 40px',
}

const labelCell = {
  color: '#8898aa',
  fontSize: '14px',
  padding: '8px 0',
  width: '40%',
}

const valueCell = {
  color: '#333',
  fontSize: '14px',
  padding: '8px 0',
}

const warningSection = {
  padding: '24px 0',
}

const list = {
  margin: '0',
  padding: '0 40px 0 56px',
}

const listItem = {
  color: '#333',
  fontSize: '15px',
  lineHeight: '24px',
  marginBottom: '12px',
}

const buttonSection = {
  padding: '32px 40px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#ef4444',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const helpSection = {
  padding: '24px 0',
  backgroundColor: '#f9fafb',
}

const link = {
  color: '#6366f1',
  textDecoration: 'underline',
}

const footer = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
  padding: '24px 40px 0',
}

const smallText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '16px 40px',
}
