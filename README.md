# ReLearn.ai — AI-Powered Learning Platform (v6.0)

ReLearn.ai is a premium, AI-native learning platform designed to help users organize their learning journey with personalized study plans, deep analytics, a collaborative study hub, and an intelligent AI tutor.

## What's New in v6.0
* **Upgraded AI Engine**: Powered by the latest **Gemini 3.1 Pro** for advanced reasoning, faster plan generation, and deep contextual tutoring.
* **God-Mode Admin Dashboard**: A comprehensive administrative suite featuring real-time system metrics, detailed user & plan analytics, cross-platform broadcasting, and a secure Supabase Role-Based Access Control (RBAC) architecture.
* **Global Command Palette**: Lightning-fast navigation via keyboard shortcuts (macOS: `⌘K` / Windows: `Ctrl+K`), allowing users to jump anywhere in the app instantly.
* **Self-Healing Sync Engine**: Invisible background data synchronization with offline resilience and multi-layered local persistence (IndexedDB + localStorage).
* **Premium UX/UI**: Upgraded design system featuring smooth framer-motion animations, responsive glassmorphism interfaces, and dynamic haptic feedback.

## Core Features

- **AI-Powered Plan Generation** — Generate highly personalized study plans based on goals, difficulty levels, and timeframes using Gemini 3.1 Pro.
- **Collaborative Study Hub** — Real-time social learning with live chat, member presence, and shared focus sessions via Supabase Realtime.
- **Deep Gamification System** — Earn XP, level up, and unlock 30+ unique badges across 4 rarity tiers.
- **AI-Guided Learning Workspace** — Contextual deep-dives, practice activities, and curated educational resources for every topic.
- **Interactive Onboarding** — Smart tutorial guide that helps users master the platform in minutes.
- **Comprehensive Help Center** — Full shortcut reference, system status tracking, and setup guides.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI Services**: Google Gemini API (Gemini 3.1 Pro & Flash)
- **Backend & Auth**: Supabase (Auth, PostgreSQL DB, Realtime, RLS Policies)
- **Video API**: YouTube Data API v3
- **Build Tool**: Vite
- **Animations**: Motion (Framer Motion)
- **Charts**: Recharts

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your API keys (Supabase, Gemini, YouTube).
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
├── components/          # React UI components (40+ components)
│   ├── admin/           # Admin God-Mode features & analytics
│   ├── common/          # Reusable UI (Command Palette, Icons, etc.)
│   ├── StudyRooms.tsx   # Real-time social learning hub
│   ├── Dashboard.tsx    # Main dashboard with task management
│   ├── LearningWorkspace.tsx  # AI-guided study session
│   ├── HelpCenter.tsx   # Knowledge base & system status
│   └── ...
├── contexts/            # React context providers
│   ├── AuthContext.tsx   # Supabase Auth state management
│   ├── DataContext.tsx   # Core data & gamification logic
│   └── ConnectionContext.tsx # Sync & network stability
├── services/            # API and external services
│   ├── supabase.ts      # Supabase configuration
│   ├── adminService.ts  # Admin dashboard logic & RPC calls
│   ├── gemini/          # Gemini AI configuration and prompt logic
│   ├── dataService.ts   # "Self-healing" storage layer
│   └── ...
├── types.ts             # TypeScript type definitions
├── App.tsx              # Main app routing & layout
└── ...
```

## Deployment

Build for production:
```bash
npm run build
```

The output is generated in the `dist/` directory, ready for deployment to Vercel, Netlify, or any static hosting provider.
