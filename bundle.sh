#!/bin/bash

# Script to zip a skills subfolder and move it to build folder
# Usage: ./bundle.sh <plugin_name_or_path>

set -e # Exit on any error

# Check if argument is provided
if [ $# -eq 0 ]; then
  echo "❌ Error: No plugin name or path provided"
  echo "Usage: ./bundle.sh <plugin_name_or_path>"
  echo "Example: ./bundle.sh architecture-design"
  echo "Example: ./bundle.sh plugins/devops/skills/helm-scaffold"
  exit 1
fi

INPUT_PATH="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGINS_DIR="$SCRIPT_DIR/plugins"
BUILD_DIR="$SCRIPT_DIR/build"

# Determine if input is a full path or just a plugin name
if [[ "$INPUT_PATH" == /* ]]; then
  # Absolute path
  SOURCE_DIR="$INPUT_PATH"
elif [[ "$INPUT_PATH" == *"/"* ]]; then
  # Relative path containing slashes
  SOURCE_DIR="$SCRIPT_DIR/$INPUT_PATH"
else
  # Just a plugin name, look for it in plugins directory
  SOURCE_DIR="$PLUGINS_DIR/$INPUT_PATH"
fi

# Normalize the path to remove any trailing slashes
SOURCE_DIR=$(realpath "$SOURCE_DIR" 2>/dev/null || echo "$SOURCE_DIR")

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ Error: Plugin directory does not exist: $SOURCE_DIR"
  echo "Available plugins:"
  find "$PLUGINS_DIR" -maxdepth 2 -type d -name "skills" | sed 's|.*/plugins/||' | sed 's|/skills||' | head -10
  exit 1
fi

# Extract plugin name and category from the path
RELATIVE_PATH=$(realpath --relative-to="$SCRIPT_DIR" "$SOURCE_DIR")

# Check if input was a full path (contains slashes) or just a plugin name
if [[ "$INPUT_PATH" == *"/"* ]]; then
  # Full path provided - extract category and use category-name.zip format
  # Remove plugins/ prefix if present
  PLUGIN_PATH=${RELATIVE_PATH#plugins/}

  if [[ "$PLUGIN_PATH" == *"/skills/"* ]]; then
    CATEGORY=$(echo "$PLUGIN_PATH" | cut -d'/' -f1)
    PLUGIN_NAME=$(echo "$PLUGIN_PATH" | sed 's|.*/skills/||')
    ZIP_FILE="$CATEGORY-$PLUGIN_NAME.zip"
  else
    # Fallback for full paths without /skills/
    PLUGIN_NAME=$(basename "$SOURCE_DIR")
    CATEGORY=$(basename "$(dirname "$SOURCE_DIR")")
    ZIP_FILE="$CATEGORY-$PLUGIN_NAME.zip"
  fi
  SHOW_CATEGORY=true
else
  # Just plugin name provided - use original behavior (plugin-name.zip)
  PLUGIN_NAME="$INPUT_PATH"
  ZIP_FILE="$PLUGIN_NAME.zip"
  SHOW_CATEGORY=false
fi

DEST_PATH="$BUILD_DIR/$ZIP_FILE"

echo "📦 Zipping plugin: $PLUGIN_NAME"
if [ "$SHOW_CATEGORY" = true ]; then
  echo "Category: $CATEGORY"
fi
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_PATH"
echo ""

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Remove existing zip file if it exists
if [ -f "$DEST_PATH" ]; then
  echo "🗑️  Removing existing zip file: $ZIP_FILE"
  rm "$DEST_PATH"
fi

echo "📁 Creating zip file..."
# Create a temporary directory structure
TEMP_DIR=$(mktemp -d)
mkdir -p "$TEMP_DIR/$PLUGIN_NAME"

# Copy the plugin contents to the temp directory
if [ -d "$SOURCE_DIR" ]; then
  cp -r "$SOURCE_DIR"/* "$TEMP_DIR/$PLUGIN_NAME/"
else
  echo "❌ Error: Plugin directory does not exist: $SOURCE_DIR"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Change to temp directory to create zip
cd "$TEMP_DIR"

# Create zip with plugin name as top-level folder
zip -r "$DEST_PATH" "$PLUGIN_NAME" \
  --exclude="*.DS_Store" \
  --exclude="*/__pycache__/*" \
  --exclude="*/.git/*" \
  --exclude="*/node_modules/*" \
  --exclude="*/.pytest_cache/*" \
  --exclude="*/.claude-plugin/*" \
  --exclude="*.pyc" \
  --exclude="*.pyo" \
  --exclude="*.log"

# Return to original directory
cd - >/dev/null

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Check if zip was created successfully
if [ -f "$DEST_PATH" ]; then
  # Get file size
  FILE_SIZE=$(du -h "$DEST_PATH" | cut -f1)
  echo "✅ Successfully created zip file!"
  echo "📦 Location: $DEST_PATH"
  echo "📏 Size: $FILE_SIZE"
  echo ""
  echo "📋 Build directory contents:"
  ls -lh "$BUILD_DIR" | grep -E "\.zip$|total" || echo "  (No zip files found)"
else
  echo "❌ Error: Failed to create zip file"
  exit 1
fi

echo ""
echo "🎉 Plugin packaging complete!"

