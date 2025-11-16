/**
 * Usage Warning Email Template
 *
 * Sent to: Free tier users approaching usage limits
 * From: hello@synaptic.study
 * Reply-to: support@synaptic.study
 * Trigger: Usage API when user hits 80% of limit
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

interface UsageWarningEmailProps {
  userName?: string
  usagePercentage: number
  limitType: string // e.g., "documents", "flashcards", "chat messages"
  currentUsage: number
  maxLimit: number
  upgradeUrl: string
}

export default function UsageWarningEmail({
  userName = 'there',
  usagePercentage,
  limitType,
  currentUsage,
  maxLimit,
  upgradeUrl,
}: UsageWarningEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You're approaching your monthly usage limit on Synaptic</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={warningBox}>
            <Heading style={h1}>Usage Alert</Heading>
          </Section>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            You've used <strong>{usagePercentage}%</strong> of your monthly {limitType} limit on
            Synaptic. You're making great progress with your learning!
          </Text>

          <Section style={usageSection}>
            <div style={progressBarContainer}>
              <div style={{ ...progressBar, width: `${usagePercentage}%` }} />
            </div>
            <Text style={usageText}>
              {currentUsage} / {maxLimit} {limitType} used this month
            </Text>
          </Section>

          <Section style={infoSection}>
            <Heading style={h2}>What happens when you reach the limit?</Heading>
            <Text style={text}>
              Once you hit {maxLimit} {limitType}, you'll need to wait until your usage resets next
              month, or you can upgrade to Premium for unlimited access.
            </Text>
          </Section>

          <Section style={premiumSection}>
            <Heading style={h2}>Upgrade to Premium for:</Heading>
            <ul style={list}>
              <li style={listItem}>
                <strong>Unlimited {limitType}</strong> - No monthly caps
              </li>
              <li style={listItem}>
                <strong>Unlimited everything</strong> - Documents, flashcards, chat, podcasts, mind
                maps
              </li>
              <li style={listItem}>
                <strong>Advanced features</strong> - RAG for 500MB+ documents, priority support
              </li>
              <li style={listItem}>
                <strong>Early access</strong> - Try new features first
              </li>
            </ul>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={upgradeUrl}>
              Upgrade to Premium
            </Button>
          </Section>

          <Text style={text}>
            Questions about usage limits or pricing? We're here to help at{' '}
            <Link href="mailto:support@synaptic.study" style={link}>
              support@synaptic.study
            </Link>
          </Text>

          <Text style={footer}>
            Keep learning!
            <br />
            The Synaptic Team
          </Text>

          <Text style={smallText}>
            Your usage resets on the 1st of each month. View your current usage from your{' '}
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

const warningBox = {
  backgroundColor: '#fffbeb',
  borderLeft: '4px solid #f59e0b',
  padding: '16px 40px',
}

const h1 = {
  color: '#92400e',
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

const usageSection = {
  padding: '32px 40px',
  backgroundColor: '#f9fafb',
  marginTop: '24px',
}

const progressBarContainer = {
  width: '100%',
  height: '24px',
  backgroundColor: '#e5e7eb',
  borderRadius: '12px',
  overflow: 'hidden',
  marginBottom: '12px',
}

const progressBar = {
  height: '100%',
  backgroundColor: '#f59e0b',
  transition: 'width 0.3s ease',
}

const usageText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0',
  padding: '0',
}

const infoSection = {
  padding: '24px 0',
}

const premiumSection = {
  padding: '24px 0',
  backgroundColor: '#fefce8',
  marginTop: '32px',
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
