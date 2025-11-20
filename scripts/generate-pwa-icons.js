/**
 * Generate PWA icons from logo-brain.png with transparent backgrounds
 * Run with: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

// Icon sizes needed for PWA
const sizes = [
  { width: 192, height: 192, name: 'icon-192x192.png' },
  { width: 512, height: 512, name: 'icon-512x512.png' },
  { width: 180, height: 180, name: 'apple-touch-icon-new.png' }
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons from logo-brain.png...\n');

  try {
    // Load the source image
    const sourceImage = await loadImage('public/logo-brain.png');
    console.log(`✅ Loaded source image: ${sourceImage.width}x${sourceImage.height}`);

    // Generate each size
    for (const size of sizes) {
      const canvas = createCanvas(size.width, size.height);
      const ctx = canvas.getContext('2d');

      // Clear canvas (transparent background)
      ctx.clearRect(0, 0, size.width, size.height);

      // Calculate scaling to fit the logo centered with some padding
      const padding = size.width * 0.1; // 10% padding
      const maxSize = size.width - (padding * 2);

      // Calculate aspect ratio
      const sourceAspect = sourceImage.width / sourceImage.height;
      let drawWidth, drawHeight;

      if (sourceAspect > 1) {
        // Wider than tall
        drawWidth = maxSize;
        drawHeight = maxSize / sourceAspect;
      } else {
        // Taller than wide or square
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
      console.log(`✅ Generated ${size.name} (${size.width}x${size.height})`);
    }

    console.log('\n🎉 All icons generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Replace old apple-touch-icon.png with apple-touch-icon-new.png');
    console.log('2. Update site.webmanifest to use the new icons');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);

    if (error.message.includes('canvas')) {
      console.log('\n💡 You need to install the canvas package:');
      console.log('   npm install canvas');
    }
  }
}

generateIcons();
