# ReLearn.ai — AI-Powered Learning Platform

ReLearn.ai is an intelligent, AI-powered learning platform that helps you organize your learning journey with personalized study plans, progress tracking, and an AI tutor.

## Features

- **AI-Powered Plan Generation** — Generate personalized study plans based on your goals, difficulty level, and timeframe using Gemini AI.
- **Collaborative Study Hub** — Real-time social learning with live chat, member presence, and shared focus sessions.
- **Momentum-First Dashboard** — Intelligent UI that prioritizes "Active Learning" nudges (Streaks, Daily Goals) while auto-routing passive reminders to the Notification Center.
- **Deep Gamification System** — Earn XP, level up, and unlock 30+ unique badges across 4 rarity tiers with native haptic feedback.
- **AI-Guided Learning Workspace** — Contextual deep-dives, practice activities, and curated educational resources for every topic.
- **Self-Healing Sync Engine** — Advanced background synchronization with "invisible" state recovery and multi-layered local persistence (IndexedDB + localStorage).
- **Interactive Onboarding** — Smart tutorial guide that masters the platform in minutes.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI Services**: Google Gemini API (Plan Generation, Chat, Image Generation, Learning Workspace)
- **Authentication**: Supabase Auth (Email/Password + Google Sign-In)
- **Database**: Supabase Database (PostgreSQL)
- **Video API**: YouTube Data API v3
- **Build Tool**: Vite
- **Icons**: Material Symbols, Lucide React
- **Charts**: Recharts
- **Animations**: Motion (Framer Motion)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
Relearn.ai/
├── components/          # React UI components (35+ components)
│   ├── StudyRooms.tsx   # Real-time social learning hub
│   ├── RoomView.tsx     # Collaborative study room with chat
│   ├── Dashboard.tsx    # Main dashboard with task management
│   ├── CreatePlan.tsx   # AI plan generation form
│   ├── LearningWorkspace.tsx  # AI-guided study session
│   ├── Progress.tsx     # Analytics & Badge gallery
│   ├── TutorialGuide.tsx# Guided walkthrough system
│   ├── OfflineIndicator.tsx # Sync status & retry manager
│   ├── StorageWarningToast.tsx # Storage failure handling
│   └── ...
├── contexts/            # React context providers
│   ├── AuthContext.tsx   # Supabase Auth state management
│   ├── DataContext.tsx   # Core data & gamification logic
│   ├── ConnectionContext.tsx # Sync & network stability
│   └── TutorialContext.tsx  # Onboarding state
├── services/            # API and external services
│   ├── supabase.ts      # Supabase configuration
│   ├── gemini/          # Gemini AI services
│   ├── dataService.ts   # "Self-healing" storage layer
│   ├── gamificationService.ts # Badge & XP logic
│   ├── roomService.ts   # Real-time room management
│   ├── shareService.ts  # Plan sharing & slugs
│   ├── youtubeService.ts
│   └── ...
├── types.ts             # TypeScript type definitions
├── App.tsx              # Main app with routing
└── ...
```

## Environment Variables

See [`.env.example`](.env.example) for all required API keys:

- **Supabase** — Authentication, Database, and Real-time subscriptions
- **Gemini AI** — Intelligence layer for all AI features
- **YouTube** — Educational video search

## Deployment

Build for production:
```bash
npm run build
```

The output is in the `dist/` directory, ready for deployment to Vercel, Netlify, or any static hosting provider.
