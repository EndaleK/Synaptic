/**
 * Remove white background from logo-full.png and make it transparent
 * Run with: node scripts/make-logo-full-transparent.js
 */

const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function makeLogoTransparent() {
  console.log('🎨 Removing white background from logo-full.png...\n');

  try {
    // Load the source image
    const sourceImage = await loadImage('public/logo-full.png');
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
    let pixelsRemoved = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // If pixel is near-white, make it transparent
      if (r >= threshold && g >= threshold && b >= threshold) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
        pixelsRemoved++;
      }
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);

    // Save the transparent version
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('public/logo-full-transparent.png', buffer);

    const fileSize = (buffer.length / 1024).toFixed(2);
    console.log(`✅ Created logo-full-transparent.png (${fileSize} KB)`);
    console.log(`   Removed ${pixelsRemoved.toLocaleString()} white pixels`);

    console.log('\n🎉 Background removed successfully!');
    console.log('📝 File saved as: public/logo-full-transparent.png');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Make sure you have canvas installed:');
    console.error('   npm install canvas');
  }
}

makeLogoTransparent();
