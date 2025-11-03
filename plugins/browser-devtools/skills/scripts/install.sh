#!/bin/bash
# Installation script for browser-devtools skill

set -e

echo "🚀 Installing browser-devtools skill..."

# Check if Node.js is installed
if ! command -v node &>/dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js 18+ first."
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ is required. Current version: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm dependencies are already installed
if [ ! -d "node_modules" ] || ! npm list playwright &>/dev/null; then
  echo "📦 Installing npm dependencies..."
  npm install
else
  echo "✅ npm dependencies already installed"
fi

# Check if build is needed
BUILD_NEEDED=false
if [ ! -d "dist" ]; then
  BUILD_NEEDED=true
else
  # Check if any source files are newer than dist files
  for ts_file in scripts/*.ts lib/*.ts; do
    if [ -f "$ts_file" ]; then
      js_file="dist/${ts_file%.*}.js"
      if [ ! -f "$js_file" ] || [ "$ts_file" -nt "$js_file" ]; then
        BUILD_NEEDED=true
        break
      fi
    fi
  done
fi

if [ "$BUILD_NEEDED" = true ]; then
  echo "📦 Building TypeScript files..."
  npm run build
else
  echo "✅ Build files are up to date"
fi

# Check if Playwright browsers are installed
BROWSER_CHECK=$(node -e "try { require('playwright').chromium.executablePath(); console.log('OK'); } catch(e) { console.log('MISSING'); }" 2>/dev/null || echo "MISSING")
if [ "$BROWSER_CHECK" != "OK" ]; then
  echo "🌐 Installing Playwright browsers..."
  npx playwright install
else
  echo "✅ Playwright browsers already installed"
fi

# Install system dependencies on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "🔧 Installing system dependencies for Linux..."

  # Detect distribution
  if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    echo "Detected Debian/Ubuntu-based system"
    sudo apt-get update
    sudo apt-get install -y \
      libnss3 \
      libnspr4 \
      libasound2t64 \
      libatk1.0-0 \
      libatk-bridge2.0-0 \
      libcups2 \
      libdrm2 \
      libxkbcommon0 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxrandr2 \
      libgbm1
  elif [ -f /etc/redhat-release ]; then
    # RHEL/Fedora/CentOS
    echo "Detected RedHat/Fedora-based system"
    if command -v dnf &>/dev/null; then
      sudo dnf install -y \
        nss \
        nspr \
        alsa-lib \
        atk \
        at-spi2-atk \
        cups-libs \
        libdrm \
        libxkbcommon \
        libXcomposite \
        libXdamage \
        libXfixes \
        libXrandr \
        mesa-libgbm
    else
      sudo yum install -y \
        nss \
        nspr \
        alsa-lib \
        atk \
        at-spi2-atk \
        cups-libs \
        libdrm \
        libxkbcommon \
        libXcomposite \
        libXdamage \
        libXfixes \
        libXrandr \
        mesa-libgbm
    fi
  elif [ -f /etc/arch-release ]; then
    # Arch Linux
    echo "Detected Arch-based system"
    sudo pacman -S --needed \
      nss \
      nspr \
      alsa-lib \
      atk \
      at-spi2-atk \
      cups \
      libdrm \
      libxkbcommon \
      libxcomposite \
      libxdamage \
      libxfixes \
      libxrandr \
      mesa
  else
    echo "⚠️  Unknown Linux distribution. Please install browser dependencies manually."
    echo "See: https://playwright.dev/docs/linux/"
  fi
fi

# Create necessary directories
mkdir -p docs/screenshots
mkdir -p docs/traces
mkdir -p docs/reports

echo "✅ Installation completed successfully!"
echo ""
echo "🧪 Test the installation:"
echo "   node dist/scripts/navigate.js --url https://example.com"
echo ""
echo "📚 For usage examples, see SKILL.md"

