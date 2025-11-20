/**
 * Verify that icons have transparent backgrounds
 * Run with: node scripts/verify-transparent-icons.js
 */

const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

const icons = [
  'public/icon-192x192.png',
  'public/icon-512x512.png',
  'public/apple-touch-icon.png',
  'public/favicon-16x16.png',
  'public/favicon-32x32.png',
  'public/logo-brain-transparent.png'
];

async function verifyTransparency(filePath) {
  const img = await loadImage(filePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let transparentPixels = 0;
  let totalPixels = canvas.width * canvas.height;

  // Check for transparent pixels (alpha < 255)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      transparentPixels++;
    }
  }

  const transparencyPercent = ((transparentPixels / totalPixels) * 100).toFixed(2);
  const hasTransparency = transparentPixels > 0;

  return {
    file: filePath.replace('public/', ''),
    width: img.width,
    height: img.height,
    transparentPixels,
    totalPixels,
    transparencyPercent: `${transparencyPercent}%`,
    hasTransparency,
    status: hasTransparency ? '✅' : '❌'
  };
}

async function main() {
  console.log('🔍 Verifying icon transparency...\n');

  for (const icon of icons) {
    try {
      const result = await verifyTransparency(icon);
      console.log(`${result.status} ${result.file}`);
      console.log(`   Size: ${result.width}x${result.height}`);
      console.log(`   Transparent pixels: ${result.transparentPixels.toLocaleString()} (${result.transparencyPercent})`);
      console.log('');
    } catch (error) {
      console.log(`❌ ${icon.replace('public/', '')} - Error: ${error.message}\n`);
    }
  }

  console.log('✨ Verification complete!');
}

main();
