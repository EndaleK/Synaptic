/**
 * Subscription Confirmed Email Template
 *
 * Sent to: Users when they successfully subscribe to premium
 * From: hello@synaptic.study
 * Reply-to: support@synaptic.study
 * Trigger: Stripe webhook checkout.session.completed
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

interface SubscriptionConfirmedEmailProps {
  userName?: string
  planName: string
  billingInterval: 'month' | 'year'
  dashboardUrl: string
}

export default function SubscriptionConfirmedEmail({
  userName = 'there',
  planName,
  billingInterval,
  dashboardUrl,
}: SubscriptionConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Synaptic Premium - Unlock Unlimited Learning</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={successBox}>
            <Heading style={h1}>🎉 You're Now Premium!</Heading>
          </Section>

          <Text style={text}>Hi {userName},</Text>

          <Text style={text}>
            Congratulations! Your subscription to <strong>{planName}</strong> is now active. You
            now have unlimited access to all of Synaptic's premium features.
          </Text>

          <Section style={featuresSection}>
            <Heading style={h2}>What's Unlocked:</Heading>
            <ul style={list}>
              <li style={listItem}>
                <strong>Unlimited Documents:</strong> Upload and chat with files up to 500MB each
              </li>
              <li style={listItem}>
                <strong>Unlimited Flashcards:</strong> Generate as many flashcard sets as you need
              </li>
              <li style={listItem}>
                <strong>Unlimited AI Chat:</strong> Have unlimited conversations with your study
                materials
              </li>
              <li style={listItem}>
                <strong>Unlimited Podcasts:</strong> Convert any document to audio for learning on
                the go
              </li>
              <li style={listItem}>
                <strong>Unlimited Mind Maps:</strong> Visualize complex topics without limits
              </li>
              <li style={listItem}>
                <strong>Advanced RAG:</strong> Use vector search for massive documents (textbooks,
                research papers)
              </li>
              <li style={listItem}>
                <strong>Priority Support:</strong> Get help faster when you need it
              </li>
              <li style={listItem}>
                <strong>Early Access:</strong> Be the first to try new features
              </li>
            </ul>
          </Section>

          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              Start Learning Now
            </Button>
          </Section>

          <Section style={tipsSection}>
            <Heading style={h2}>Make the Most of Premium:</Heading>
            <Text style={text}>
              1. <strong>Upload large documents:</strong> Try uploading a full textbook or research
              paper
              <br />
              2. <strong>Create comprehensive flashcard sets:</strong> Generate cards from entire
              chapters
              <br />
              3. <strong>Use podcasts for commuting:</strong> Convert lecture notes to audio
              <br />
              4. <strong>Explore mind maps:</strong> Visualize connections between complex concepts
              <br />
            </Text>
          </Section>

          <Text style={text}>
            Your subscription will renew automatically every {billingInterval}. You can manage your
            subscription, update payment methods, or cancel anytime from your dashboard.
          </Text>

          <Text style={text}>
            Questions or need help getting started? We're here!{' '}
            <Link href="mailto:support@synaptic.study" style={link}>
              support@synaptic.study
            </Link>
          </Text>

          <Text style={footer}>
            Thank you for supporting Synaptic!
            <br />
            The Synaptic Team
          </Text>

          <Text style={smallText}>
            Manage your subscription from your{' '}
            <Link href={dashboardUrl} style={link}>
              dashboard
            </Link>
            . Billing questions? Email{' '}
            <Link href="mailto:support@synaptic.study" style={link}>
              support@synaptic.study
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

const successBox = {
  backgroundColor: '#f0fdf4',
  borderLeft: '4px solid #22c55e',
  padding: '16px 40px',
}

const h1 = {
  color: '#166534',
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

const featuresSection = {
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
  backgroundColor: '#22c55e',
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
  padding: '24px 0',
  backgroundColor: '#f9fafb',
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
