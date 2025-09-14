#!/bin/bash

# Portfolio Clicker Game Rework Setup Script
# This script prepares the project for the architectural refactor

echo "🚀 Setting up Portfolio Clicker Game Rework..."

# Check if we're on the correct branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "feature/clicker-game-rework" ]; then
    echo "⚠️  Warning: Not on feature/clicker-game-rework branch"
    echo "Current branch: $CURRENT_BRANCH"
    echo "Switching to feature/clicker-game-rework..."
    git checkout feature/clicker-game-rework
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests to ensure current state is working
echo "🧪 Running tests..."
npm run test:galaxy

# Check TypeScript compilation
echo "🔍 Checking TypeScript compilation..."
npx tsc --noEmit

# Build the project
echo "🏗️  Building project..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review REWORK_PLAN.md for detailed refactor plan"
echo "2. Start with Phase 1: Critical Fixes"
echo "3. Enable TypeScript strict mode in tsconfig.json"
echo "4. Add error boundaries and fix memory leaks"
echo ""
echo "🎯 Focus areas:"
echo "- Split useClusteringGalaxy hook into focused modules"
echo "- Add simple tutorial overlay"
echo "- Improve HUD design and UX"
echo "- Optimize performance and add frame rate limiting"
echo ""
echo "Happy coding! 🚀"
