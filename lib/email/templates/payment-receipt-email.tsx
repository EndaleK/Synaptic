/**
 * Payment Receipt Email Template
 *
 * Sent to: Users when payment succeeds
 * From: hello@synaptic.study
 * Reply-to: support@synaptic.study
 * Trigger: Stripe webhook invoice.payment_succeeded
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
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface PaymentReceiptEmailProps {
  userName?: string
  amountPaid: number // in cents
  currency: string
  planName: string
  billingPeriodStart: string
  billingPeriodEnd: string
  invoiceUrl?: string
  cardLast4?: string
}

export default function PaymentReceiptEmail({
  userName = 'there',
  amountPaid,
  currency = 'usd',
  planName,
  billingPeriodStart,
  billingPeriodEnd,
  invoiceUrl,
  cardLast4,
}: PaymentReceiptEmailProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountPaid / 100)

  return (
    <Html>
      <Head />
      <Preview>Payment Receipt - Synaptic Subscription</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Payment Received</Heading>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            Thank you for your payment! Your Synaptic subscription is active and ready to go.
          </Text>

          <Section style={receiptSection}>
            <Heading style={h2}>Payment Details</Heading>

            <table style={table}>
              <tbody>
                <tr>
                  <td style={labelCell}>Plan:</td>
                  <td style={valueCell}>{planName}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Amount Paid:</td>
                  <td style={valueCell}>
                    <strong>{formattedAmount}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Billing Period:</td>
                  <td style={valueCell}>
                    {billingPeriodStart} - {billingPeriodEnd}
                  </td>
                </tr>
                {cardLast4 && (
                  <tr>
                    <td style={labelCell}>Payment Method:</td>
                    <td style={valueCell}>Card ending in {cardLast4}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          {invoiceUrl && (
            <Section style={buttonSection}>
              <Link href={invoiceUrl} style={button}>
                View Invoice
              </Link>
            </Section>
          )}

          <Hr style={hr} />

          <Section style={featuresSection}>
            <Heading style={h2}>Your Premium Benefits:</Heading>
            <ul style={list}>
              <li style={listItem}>Unlimited document uploads (up to 500MB each)</li>
              <li style={listItem}>Unlimited flashcard generation</li>
              <li style={listItem}>Unlimited AI chat conversations</li>
              <li style={listItem}>Unlimited podcast and mind map creation</li>
              <li style={listItem}>Priority support</li>
              <li style={listItem}>Advanced RAG for large documents</li>
            </ul>
          </Section>

          <Text style={text}>
            Questions about your subscription? Contact us at{' '}
            <Link href="mailto:support@synaptic.study" style={link}>
              support@synaptic.study
            </Link>
          </Text>

          <Text style={footer}>
            Thanks for supporting Synaptic!
            <br />
            The Synaptic Team
          </Text>

          <Text style={smallText}>
            You can manage your subscription anytime from your{' '}
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

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
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
}

const receiptSection = {
  padding: '24px 0',
  backgroundColor: '#f9fafb',
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

const buttonSection = {
  padding: '32px 40px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#6366f1',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 40px',
}

const featuresSection = {
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
