#!/bin/bash

# Configuration: Update this path if the Node version changes
NODE_PATH="/Users/abraham/.nvm/versions/node/v20.20.1/bin"

# Export the path
export PATH="$NODE_PATH:$PATH"

# Print node version for debugging
echo "Using Node version: $(node -v)"
echo "From path: $(which node)"

# Start the dev server
echo "Starting development server..."
npm run dev
