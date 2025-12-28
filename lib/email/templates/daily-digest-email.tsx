/**
 * Daily Digest Email Template
 *
 * Sent to: Users with flashcards due for review
 * From: hello@synaptic.study
 * Trigger: Daily cron job at 8 AM UTC
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

interface DailyDigestEmailProps {
  userName?: string
  dueFlashcards: number
  currentStreak: number
  dashboardUrl: string
}

export default function DailyDigestEmail({
  userName = 'there',
  dueFlashcards,
  currentStreak,
  dashboardUrl,
}: DailyDigestEmailProps) {
  const hasStreak = currentStreak > 0
  const streakMessage = hasStreak
    ? `Your current streak: ${currentStreak} day${currentStreak !== 1 ? 's' : ''}`
    : 'Start a new streak today!'

  return (
    <Html>
      <Head />
      <Preview>
        {dueFlashcards > 0
          ? `You have ${dueFlashcards} flashcard${dueFlashcards !== 1 ? 's' : ''} ready for review`
          : `Keep your ${currentStreak}-day streak going!`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with streak */}
          <Section style={headerSection}>
            {hasStreak && (
              <Text style={streakBadge}>
                {currentStreak} day streak
              </Text>
            )}
            <Heading style={h1}>
              {dueFlashcards > 0
                ? "Time to Study!"
                : "Keep Up the Good Work!"}
            </Heading>
          </Section>

          <Text style={text}>Hi {userName},</Text>

          {dueFlashcards > 0 ? (
            <>
              <Text style={text}>
                You have <strong style={highlight}>{dueFlashcards} flashcard{dueFlashcards !== 1 ? 's' : ''}</strong> ready
                for review today. Based on spaced repetition science, now is the optimal time to
                reinforce what you've learned.
              </Text>

              <Section style={statsSection}>
                <Text style={statText}>
                  Cards due today: <strong>{dueFlashcards}</strong>
                </Text>
                <Text style={statText}>
                  {streakMessage}
                </Text>
              </Section>
            </>
          ) : (
            <Text style={text}>
              No flashcards due today - you're all caught up! But don't forget to study to
              keep your learning momentum going. {streakMessage}
            </Text>
          )}

          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              {dueFlashcards > 0 ? 'Start Reviewing' : 'Go to Dashboard'}
            </Button>
          </Section>

          {dueFlashcards > 0 && (
            <Section style={tipSection}>
              <Text style={tipText}>
                <strong>Study Tip:</strong> Reviewing cards at the optimal time helps you
                remember information 2-3x longer. Even a quick 5-minute session makes a difference!
              </Text>
            </Section>
          )}

          <Text style={footer}>
            Happy learning!
            <br />
            The Synaptic Team
          </Text>

          <Text style={smallText}>
            You're receiving this daily digest because you have email notifications enabled.
            <br />
            <Link href={`${dashboardUrl}/settings`} style={link}>
              Update notification preferences
            </Link>
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

const headerSection = {
  textAlign: 'center' as const,
  padding: '24px 40px 0',
}

const streakBadge = {
  display: 'inline-block',
  backgroundColor: '#FEF3C7',
  color: '#D97706',
  fontSize: '14px',
  fontWeight: 'bold',
  padding: '6px 16px',
  borderRadius: '20px',
  marginBottom: '16px',
}

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '16px 0 32px',
  padding: '0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
}

const highlight = {
  color: '#6366f1',
}

const statsSection = {
  backgroundColor: '#F9FAFB',
  margin: '24px 40px',
  padding: '20px',
  borderRadius: '8px',
}

const statText = {
  color: '#333',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '4px 0',
  padding: '0',
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
  padding: '14px 40px',
}

const tipSection = {
  backgroundColor: '#EEF2FF',
  margin: '0 40px 32px',
  padding: '16px 20px',
  borderRadius: '8px',
  borderLeft: '4px solid #6366f1',
}

const tipText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  padding: '0',
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
  lineHeight: '18px',
  padding: '16px 40px',
  textAlign: 'center' as const,
}
