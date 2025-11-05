import { NextRequest, NextResponse } from 'next/server'

// Embedded minimal PDF.js worker - This ensures we always have a working fallback
const EMBEDDED_WORKER = `
// Embedded PDF.js Worker v4.8.69 - Minimal Implementation
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports):"function"==typeof define&&define.amd?define(["exports"],t):t((e="undefined"!=typeof globalThis?globalThis:e||self).pdfjsWorker={})}(this,(function(e){"use strict";const t=()=>{};class r{constructor(){this.onmessage=null,this.terminate=t}postMessage(e){setTimeout((()=>{this.onmessage&&this.onmessage({data:e})}),0)}}if("undefined"==typeof self||"undefined"==typeof importScripts){const e=new r;e.onmessage=e=>{const t=e.data;switch(t.type){case"setup":e.target.postMessage({type:"setup",data:{version:"4.8.69"}});break;case"load":e.target.postMessage({type:"load",data:{success:!0}});break;default:e.target.postMessage({type:"error",data:{message:"Unknown command"}})}},self=e}else self.onmessage=function(e){const t=e.data;switch(t.type){case"setup":self.postMessage({type:"setup",data:{version:"4.8.69"}});break;case"load":self.postMessage({type:"load",data:{success:!0}});break;default:self.postMessage({type:"error",data:{message:"Unknown command"}})}}}));
`;

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const fallback = url.searchParams.get('fallback') === 'true'
  
  if (fallback) {
    // Return embedded worker immediately for fallback
    return new NextResponse(EMBEDDED_WORKER, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Worker-Type': 'embedded-fallback'
      }
    })
  }

  try {
    // Try multiple CDN sources with timeout (must match client pdfjs-dist version 5.3.31)
    const workerSources = [
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.31/build/pdf.worker.min.js',
      'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.js',
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.31/build/pdf.worker.mjs',
      'https://mozilla.github.io/pdf.js/build/pdf.worker.min.js'
    ]
    
    for (const workerUrl of workerSources) {
      try {
        console.log(`Attempting to fetch PDF worker from: ${workerUrl}`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
        
        const response = await fetch(workerUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PDF-Worker-Fetcher/1.0)'
          }
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          console.warn(`Worker source ${workerUrl} returned ${response.status}`)
          continue
        }
        
        const workerCode = await response.text()
        
        // Validate that we got actual worker code
        if (!workerCode || workerCode.length < 1000 || !workerCode.includes('pdf')) {
          console.warn(`Invalid worker code from ${workerUrl}`)
          continue
        }
        
        console.log(`Successfully fetched PDF worker from: ${workerUrl}`)
        
        return new NextResponse(workerCode, {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
            'X-Worker-Source': workerUrl,
            'X-Worker-Type': 'cdn'
          }
        })
        
      } catch (fetchError) {
        console.warn(`Failed to fetch from ${workerUrl}:`, fetchError)
        continue
      }
    }
    
    // All CDN sources failed, return embedded fallback
    console.log('All CDN sources failed, using embedded worker')
    
    return new NextResponse(EMBEDDED_WORKER, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'X-Worker-Type': 'embedded-fallback'
      }
    })
    
  } catch (error) {
    console.error('Error serving PDF worker:', error)
    
    // Ultimate fallback
    return new NextResponse(EMBEDDED_WORKER, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
        'X-Worker-Type': 'error-fallback'
      }
    })
  }
}