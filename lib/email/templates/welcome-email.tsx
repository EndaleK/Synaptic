/**
 * Welcome Email Template
 *
 * Sent to: New users upon sign-up
 * From: hello@synaptic.study
 * Trigger: User profile creation in middleware
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

interface WelcomeEmailProps {
  userName?: string
  userEmail: string
  dashboardUrl: string
}

export default function WelcomeEmail({
  userName = 'there',
  userEmail,
  dashboardUrl,
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Synaptic - Your AI-Powered Learning Platform</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Synaptic!</Heading>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            Thanks for joining Synaptic! We're excited to help you transform the way you learn
            with AI-powered personalized education.
          </Text>

          <Section style={featureSection}>
            <Heading style={h2}>What You Can Do with Synaptic:</Heading>
            <ul style={list}>
              <li style={listItem}>
                <strong>Chat with Documents:</strong> Upload PDFs up to 500MB and have Socratic
                conversations with your study materials
              </li>
              <li style={listItem}>
                <strong>Generate Flashcards:</strong> Auto-create smart flashcards with spaced
                repetition for optimal retention
              </li>
              <li style={listItem}>
                <strong>Create Mind Maps:</strong> Visualize complex concepts with interactive
                knowledge graphs
              </li>
              <li style={listItem}>
                <strong>Generate Podcasts:</strong> Convert documents into audio for learning on
                the go
              </li>
              <li style={listItem}>
                <strong>AI Writing Assistant:</strong> Get help with essays, citations, and
                research papers
              </li>
              <li style={listItem}>
                <strong>Video Learning:</strong> Search YouTube and generate study materials from
                transcripts
              </li>
            </ul>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              Go to Dashboard
            </Button>
          </Section>

          <Section style={tipsSection}>
            <Heading style={h2}>Getting Started Tips:</Heading>
            <Text style={text}>
              1. Take the <strong>Learning Style Quiz</strong> to personalize your experience
              <br />
              2. Upload your first document (PDF, DOCX, or TXT up to 500MB)
              <br />
              3. Try generating flashcards or having a chat conversation
              <br />
              4. Explore different learning modes to find what works best for you
            </Text>
          </Section>

          <Text style={text}>
            Need help? Just reply to this email or reach us at{' '}
            <Link href="mailto:support@synaptic.study" style={link}>
              support@synaptic.study
            </Link>
          </Text>

          <Text style={footer}>
            Happy learning!
            <br />
            The Synaptic Team
          </Text>

          <Text style={smallText}>
            You're receiving this email because you signed up for Synaptic at{' '}
            <Link href="https://synaptic.study" style={link}>
              synaptic.study
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

const featureSection = {
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

const tipsSection = {
  backgroundColor: '#f9fafb',
  padding: '24px 0',
  marginTop: '32px',
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
