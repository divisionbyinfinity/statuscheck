#!/bin/bash

set -e

REQUIRED=("index.html" "nginx.conf" "images" "snippets")

echo "Checking required frontend files..."
for item in "${REQUIRED[@]}"; do
  if [ ! -e "frontend/$item" ]; then
    echo "❌ Missing: frontend/$item"
    exit 1
  fi
done

echo "✅ All required files found in ./frontend"
