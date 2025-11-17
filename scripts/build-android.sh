#!/bin/bash
#
# Build Android App Bundle for Google Play Store
# Usage: ./scripts/build-android.sh
#

set -e  # Exit on error

echo "🤖 Synaptic™ Android Build Script"
echo "=================================="
echo ""

# Check if bubblewrap is installed
if ! command -v bubblewrap &> /dev/null; then
    echo "❌ Bubblewrap CLI not found!"
    echo "Installing globally..."
    npm install -g @bubblewrap/cli
fi

# Check if android-app directory exists
if [ ! -d "android-app" ]; then
    echo "📁 Creating android-app directory..."
    mkdir -p android-app
fi

cd android-app

# Check if project is initialized
if [ ! -f "twa-manifest.json" ]; then
    echo ""
    echo "⚠️  TWA project not initialized yet!"
    echo ""
    echo "Run this command to initialize (interactive):"
    echo "  cd android-app"
    echo "  bubblewrap init --manifest https://synaptic.study/site.webmanifest"
    echo ""
    echo "After initialization, run this script again to build."
    exit 1
fi

echo "📦 Building Android App Bundle..."
echo ""

# Build the app
bubblewrap build

echo ""
echo "✅ Build complete!"
echo ""
echo "📄 Output file: android-app/app-release-bundle.aab"
echo ""
echo "Next steps:"
echo "  1. Upload app-release-bundle.aab to Google Play Console"
echo "  2. Extract SHA-256 fingerprint:"
echo "     keytool -list -v -keystore android.keystore -alias synaptic-key"
echo "  3. Update public/.well-known/assetlinks.json with fingerprint"
echo "  4. Deploy to production"
echo ""
echo "See GOOGLE-PLAY-SETUP.md for complete instructions."
