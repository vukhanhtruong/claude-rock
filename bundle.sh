#!/bin/bash

# Script to zip a skills subfolder and move it to build folder
# Usage: ./zip_skill.sh <skill_subfolder_name>

set -e  # Exit on any error

# Check if argument is provided
if [ $# -eq 0 ]; then
    echo "❌ Error: No skill subfolder name provided"
    echo "Usage: ./zip_skill.sh <skill_subfolder_name>"
    echo "Example: ./zip_skill.sh architecture-design"
    exit 1
fi

SKILL_NAME="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$SCRIPT_DIR/skills"
BUILD_DIR="$SCRIPT_DIR/build"
SOURCE_DIR="$SKILLS_DIR/$SKILL_NAME"
ZIP_FILE="$SKILL_NAME.zip"
DEST_PATH="$BUILD_DIR/$ZIP_FILE"

echo "📦 Zipping skill folder: $SKILL_NAME"
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_PATH"
echo ""

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ Error: Skill directory does not exist: $SOURCE_DIR"
    echo "Available skills:"
    ls -1 "$SKILLS_DIR" 2>/dev/null || echo "  (No skills directory found)"
    exit 1
fi

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Remove existing zip file if it exists
if [ -f "$DEST_PATH" ]; then
    echo "🗑️  Removing existing zip file: $ZIP_FILE"
    rm "$DEST_PATH"
fi

# Change to skills directory to create relative zip
cd "$SKILLS_DIR"

echo "📁 Creating zip file..."
# Create zip with relative paths, excluding common unwanted files
zip -r "$DEST_PATH" "$SKILL_NAME" \
    --exclude="*.DS_Store" \
    --exclude="*/__pycache__/*" \
    --exclude="*/.git/*" \
    --exclude="*/node_modules/*" \
    --exclude="*/.pytest_cache/*" \
    --exclude="*.pyc" \
    --exclude="*.pyo" \
    --exclude="*.log"

# Return to original directory
cd - > /dev/null

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
echo "🎉 Skill packaging complete!"