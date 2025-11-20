import { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Synaptic - AI Study App',
  description: 'Synaptic - AI study app. Flashcards, podcasts, mind maps. Works offline!',
  openGraph: {
    title: 'Synaptic - AI Study App',
    description: 'Turn PDFs into flashcards, podcasts & mind maps. Works offline!',
    url: 'https://synaptic.study/share/mobile',
  },
}

export default function ShareMobilePage() {
  // Redirect to the static HTML file
  redirect('/share-mobile.html')
}
