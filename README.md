# ReLearn.ai — AI-Powered Learning Platform (v8.3)

ReLearn.ai is a premium, AI-native learning platform designed to help users organize their learning journey with personalized study plans, deep analytics, a collaborative study hub, and an intelligent AI tutor.

## What's New in v8.3 (The Security & Peer Collaboration Update)
* **OpenAI Fallback Removal**: Completely removed all OpenAI/DALL-E 3 fallback logic, Netlify redirects, local proxies, and CSP permissions. The platform now relies exclusively on high-performance FLUX models.
* **Production-Grade Team Plans**: Resolved plan isolation using database containment filters. Implemented self-healing task cloning for invited peers, and replaced mocked progress/activities with live queries.
* **Cloud-Synced Mistake Museum**: Added the `public.mistakes` table and integrated mistake tracking into the Sync Engine, providing multi-tab and multi-device persistence for Oops Mode warmup questions.
* **Study Room Shared Notes Fix**: Patched the database schema to include the missing `shared_notes` column, enabling group notes in study rooms.
* **Strict Tenant Isolation (RLS Remediation)**: Restored RLS security rules on all major tables and removed permissive `OR true` bypasses to safeguard user study data.
* **Tailwind Safelisting & UX Polishes**: Safelisted dynamic class names to fix flashcard borders/highlights in production. Corrected tab transition indicators and populated a live friend activity feed.

## What's New in v8.2 (The PWA & Stability Update)
* **Bulletproof PWA Offline Capabilities**: Revamped service worker with dynamic asset caching (JS, CSS, images, fonts), secure root scoping (`/`), and safety checks bypassing third-party/extension fetch requests.
* **Scroll-Locked Maintenance Mode**: Refactored the maintenance mode overlay to prevent background page scrolling on mobile and desktop, adding seamless Light/Dark theme compatibility.

## What's New in v8.1 (The Live Social Update)
* **Dynamic Collaboration Hub**: The Collaboration Hub has been completely refactored from a static demo into a production-ready, database-backed social ecosystem.
* **Real-Time Study Pacts**: Propose accountability contracts to friends instantly using a real-time user search dropdown. Manage pact lifecycle (Pending → Accepted → Completed) with live Supabase subscriptions.
* **Community Learning Marathons**: Replaced static challenges with a dynamic "Marathons" event system. Admins can create and schedule community events, and users can join to earn XP and special rewards.
* **Automated Progression Engine**: A new centralized `progressionService` connects your daily task completions in the Learning Workspace directly to your marathon progress, seamlessly rewarding XP automatically.
* **Admin Marathon Console**: A dedicated management portal inside the System Console for admins to create, track, and curate community events.
* **Unique User Identity**: Introduced auto-generated, unique `@username` handles during the authentication flow, empowering the new social discovery engine.

## Core Features

- **AI-Powered Plan Generation** — Near-instant roadmaps generated via Groq (Llama 3.3) with intelligent milestone expansion.
- **Live Collaboration Hub** — Real-time social learning with StudyPacts and Community Marathons via Supabase Realtime and Row Level Security (RLS).
- **Interactive Quiz Module** — AI-generated multiple-choice assessments that test genuine understanding, complete with detailed explanations.
- **Mistake Museum & Concept Collision** — Turn failures into fuel by cataloging learning mistakes, and connect distinct ideas for deeper mastery.
- **Deep Gamification System** — Earn XP via tasks, pacts, and marathons. Level up and unlock 30+ unique badges across 4 rarity tiers.
- **AI-Guided Learning Workspace** — Contextual deep-dives, practice activities, and curated educational resources.
- **Mentor Matching & AI Personas** — Experience personalized learning with specialized AI tutors featuring distinct teaching styles.
- **Admin Console & Quality Scoring** — God-mode dashboard for system management, featuring automated AI-driven quality analysis of learning plans.
- **Premium Cover Art & PDF Exports** — Beautiful 3D isometric images generated via FLUX, and the ability to export complete learning plans to PDF.
- **Interactive Onboarding** — Smart tutorial guide that helps users master the platform in minutes.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI Services**: Groq (Llama 3.3), Google Gemini (Pro & Flash), Pollinations (FLUX)
- **Backend & Auth**: Supabase (Auth, PostgreSQL DB, Realtime, RLS Policies)
- **State Management**: React Context + "Self-healing" DataService
- **Video API**: YouTube Data API v3
- **Animations**: Motion (Framer Motion)
- **Charts**: Recharts

## Project Structure

```
Relearn.ai/
├── components/          # React UI components (45+ components)
│   ├── CollaborationHub.tsx  # Social learning, Study Pacts, & Marathons
│   ├── LearningWorkspace.tsx # AI-guided study session & task execution
│   ├── AdminDashboard.tsx    # God-Mode analytics & system management
│   ├── admin/                # Modular sub-panels for AdminDashboard
│   │   ├── MarathonManager.tsx
│   │   └── ...
│   ├── ...
├── contexts/            # React context providers
│   ├── AuthContext.tsx   # Supabase Auth state & identity management
│   ├── DataContext.tsx   # Core data & gamification logic
│   └── ...
├── services/            # API and external services
│   ├── studyPactService.ts   # Peer-to-peer accountability logic & real-time sync
│   ├── marathonService.ts    # Global community event management
│   ├── xpService.ts          # Centralized XP and level progression logic
│   ├── progressionService.ts # Automation connecting tasks to social goals
│   ├── mistakeMuseumService.ts # Error-based learning tracker
│   ├── dataService.ts   # "Self-healing" storage layer
│   └── ...
├── types.ts             # TypeScript type definitions
├── App.tsx              # Main app routing & layout
└── ...
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your API keys (Supabase, Gemini, YouTube, Groq).
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment

The project is optimized for **Netlify** with built-in Edge Functions for Groq proxying.
```bash
npm run build
```
