/**
 * Remove white background from logo-brain.png and make it transparent
 * Run with: node scripts/remove-white-background.js
 */

const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function removeWhiteBackground() {
  console.log('🎨 Removing white background from logo-brain.png...\n');

  try {
    // Load the source image
    const sourceImage = await loadImage('public/logo-brain.png');
    console.log(`✅ Loaded source image: ${sourceImage.width}x${sourceImage.height}`);

    // Create canvas matching source size
    const canvas = createCanvas(sourceImage.width, sourceImage.height);
    const ctx = canvas.getContext('2d');

    // Draw the original image
    ctx.drawImage(sourceImage, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Remove white/near-white pixels
    // Threshold for "white" (RGB values close to 255)
    const threshold = 240;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // If pixel is near-white, make it transparent
      if (r >= threshold && g >= threshold && b >= threshold) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);

    // Save the transparent version
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('public/logo-brain-transparent.png', buffer);
    console.log('✅ Created logo-brain-transparent.png with transparent background');

    console.log('\n🎉 Background removed successfully!');
    console.log('\n📝 Now generating PWA icons from transparent logo...');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Icon sizes needed for PWA
const sizes = [
  { width: 192, height: 192, name: 'icon-192x192.png' },
  { width: 512, height: 512, name: 'icon-512x512.png' },
  { width: 180, height: 180, name: 'apple-touch-icon.png' }
];

async function generateIcons() {
  try {
    // Load the transparent logo
    const sourceImage = await loadImage('public/logo-brain-transparent.png');

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
      console.log(`✅ Generated ${size.name} (${size.width}x${size.height}) with transparent background`);
    }

    console.log('\n🎉 All transparent icons generated successfully!');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
  }
}

async function main() {
  await removeWhiteBackground();
  await generateIcons();
}

main();
