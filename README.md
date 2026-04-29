# ReLearn.ai — AI-Powered Learning Platform (v7.0)

ReLearn.ai is a premium, AI-native learning platform designed to help users organize their learning journey with personalized study plans, deep analytics, a collaborative study hub, and an intelligent AI tutor.

## What's New in v7.0 (The Speed & Visual Update)
* **Hybrid AI Engine (Groq + Gemini)**: High-speed plan generation powered by **Groq (Llama 3.3)** for near-instant roadmaps, while retaining **Gemini** for deep contextual tutoring and YouTube optimization.
* **Premium Image Pipeline (FLUX)**: High-fidelity, consistent cover images generated via the **FLUX model** through Pollinations, following the "Nano Banana" 3D design system.
* **Smart Resource Variety**: Optimized YouTube search logic that prevents repetitive results and ensures a fresh selection of tutorials on every refresh.
* **Streaming AI Chat**: Real-time word-by-word streaming responses for the AI Tutor, providing a responsive, ChatGPT-like experience.
* **God-Mode Admin Dashboard**: A comprehensive administrative suite featuring real-time system metrics, detailed user & plan analytics, and secure Supabase RBAC architecture.

## Core Features

- **AI-Powered Plan Generation** — Near-instant roadmaps generated via Groq (Llama 3.3) with intelligent milestone expansion to avoid repetitive tasks.
- **Premium Cover Art** — Beautiful, topic-relevant 3D isometric images for every plan using the FLUX engine.
- **Collaborative Study Hub** — Real-time social learning with live chat, member presence, and shared focus sessions via Supabase Realtime.
- **Deep Gamification System** — Earn XP, level up, and unlock 30+ unique badges across 4 rarity tiers.
- **AI-Guided Learning Workspace** — Contextual deep-dives, practice activities, and curated educational resources for every topic.
- **Interactive Onboarding** — Smart tutorial guide that helps users master the platform in minutes.
- **Comprehensive Help Center** — Full shortcut reference, system status tracking, and setup guides.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI Services**: Groq (Llama 3.3), Google Gemini (Pro & Flash), Pollinations (FLUX)
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
