import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Synaptic - AI Study Companion | Better than NotebookLM',
  description: 'Upload PDFs → Get flashcards, podcasts, mind maps & practice exams. Better than NotebookLM. Works offline!',
  openGraph: {
    title: 'Synaptic - Your AI Study Companion',
    description: 'Upload PDFs → Get flashcards, podcasts, mind maps & practice exams. Better than NotebookLM. Works offline!',
    url: 'https://synaptic.study/share',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function SharePage() {
  // Redirect to the static HTML file
  redirect('/share.html')
}
