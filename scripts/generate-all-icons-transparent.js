/**
 * Generate all icons (PWA + favicons) with transparent backgrounds
 * Run with: node scripts/generate-all-icons-transparent.js
 */

const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

// All icon sizes needed
const sizes = [
  // PWA icons
  { width: 192, height: 192, name: 'icon-192x192.png', description: 'PWA Android standard' },
  { width: 512, height: 512, name: 'icon-512x512.png', description: 'PWA Android high-res' },
  { width: 180, height: 180, name: 'apple-touch-icon.png', description: 'iOS home screen' },

  // Favicons
  { width: 16, height: 16, name: 'favicon-16x16.png', description: 'Browser tab small' },
  { width: 32, height: 32, name: 'favicon-32x32.png', description: 'Browser tab standard' }
];

async function generateAllIcons() {
  console.log('🎨 Generating all icons with transparent backgrounds...\n');

  try {
    // Check if transparent logo exists, if not create it first
    if (!fs.existsSync('public/logo-brain-transparent.png')) {
      console.log('Creating transparent logo first...\n');
      await removeWhiteBackground();
    }

    // Load the transparent logo
    const sourceImage = await loadImage('public/logo-brain-transparent.png');
    console.log(`✅ Loaded transparent logo: ${sourceImage.width}x${sourceImage.height}\n`);

    // Generate each size
    for (const size of sizes) {
      const canvas = createCanvas(size.width, size.height);
      const ctx = canvas.getContext('2d');

      // Clear canvas (transparent background)
      ctx.clearRect(0, 0, size.width, size.height);

      // Calculate scaling to fit the logo centered with padding
      const padding = size.width * 0.1; // 10% padding
      const maxSize = size.width - (padding * 2);

      // Calculate aspect ratio
      const sourceAspect = sourceImage.width / sourceImage.height;
      let drawWidth, drawHeight;

      if (sourceAspect > 1) {
        drawWidth = maxSize;
        drawHeight = maxSize / sourceAspect;
      } else {
        drawHeight = maxSize;
        drawWidth = maxSize * sourceAspect;
      }

      // Center the image
      const x = (size.width - drawWidth) / 2;
      const y = (size.height - drawHeight) / 2;

      // Draw with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceImage, x, y, drawWidth, drawHeight);

      // Save to file
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(`public/${size.name}`, buffer);
      console.log(`✅ ${size.name.padEnd(25)} (${size.width}x${size.height}) - ${size.description}`);
    }

    console.log('\n🎉 All icons generated successfully with transparent backgrounds!');
    console.log('\n💡 All icons now have transparent backgrounds and will look great on dark mode.');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
  }
}

async function removeWhiteBackground() {
  const sourceImage = await loadImage('public/logo-brain.png');
  const canvas = createCanvas(sourceImage.width, sourceImage.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(sourceImage, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const threshold = 240;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('public/logo-brain-transparent.png', buffer);
  console.log('✅ Created logo-brain-transparent.png\n');
}

generateAllIcons();
