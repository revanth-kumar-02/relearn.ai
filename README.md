# ReLearn.ai — AI-Powered Learning Platform

ReLearn.ai is an intelligent, AI-powered learning platform that helps you organize your learning journey with personalized study plans, progress tracking, and an AI tutor.

## Features

- **AI-Powered Plan Generation** — Generate personalized study plans based on your goals, difficulty level, and timeframe using Gemini AI.
- **AI Cover Images** — Automatically generates beautiful, topic-relevant cover images for each plan.
- **Interactive Learning Workspace** — AI-guided study sessions with explanations, practice activities, and resources.
- **AI Chatbot** — Ask questions and get help from your personal AI study assistant.
- **YouTube Video Resources** — Curated educational videos fetched from YouTube for each topic.
- **Progress Tracking** — Visual charts and stats to track your learning journey.
- **Learning Diary** — Keep a journal of your learning experiences.
- **Study Timer** — Built-in Pomodoro-style study timer.
- **Dark Mode** — Full light/dark theme support.
- **PWA Ready** — Installable as a Progressive Web App on mobile and desktop.
- **Google Sign-In** — Quick authentication with Google or email/password.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI Services**: Google Gemini API (Plan Generation, Chat, Image Generation, Learning Workspace)
- **Authentication**: Firebase Auth (Email/Password + Google Sign-In)
- **Database**: Cloud Firestore (real-time sync)
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
├── components/          # React UI components (23 components)
│   ├── Login.tsx        # Login page with Google Sign-In
│   ├── CreateAccount.tsx# Signup page
│   ├── Dashboard.tsx    # Main dashboard with calendar & tasks
│   ├── CreatePlan.tsx   # AI plan generation form
│   ├── PlanDetails.tsx  # Plan view with task management
│   ├── LearningWorkspace.tsx  # AI-guided study session
│   ├── ChatBot.tsx      # AI chatbot
│   ├── Progress.tsx     # Analytics & charts
│   ├── Profile.tsx      # User profile management
│   └── ...
├── contexts/            # React context providers
│   ├── AuthContext.tsx   # Firebase Auth state management
│   ├── DataContext.tsx   # Firestore data management
│   └── TutorialContext.tsx  # Onboarding tutorial
├── services/            # API and external services
│   ├── gemini/          # Gemini AI services
│   │   ├── planGeneratorService.ts
│   │   ├── chatbotService.ts
│   │   ├── coverImageService.ts
│   │   ├── imageService.ts
│   │   └── learningWorkspaceService.ts
│   ├── youtubeService.ts
│   └── notificationService.ts
├── firebase.ts          # Firebase configuration
├── firestore.rules      # Firestore security rules
├── types.ts             # TypeScript type definitions
├── App.tsx              # Main app with routing
├── index.tsx            # React entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies
```

## Environment Variables

See [`.env.example`](.env.example) for all required API keys:

- **Firebase** — Authentication & database
- **Gemini AI** — Plan generation, chatbot, image generation, learning workspace
- **YouTube** — Educational video search

## Deployment

Build for production:
```bash
npm run build
```

The output is in the `dist/` directory, ready for deployment to Vercel, Netlify, or any static hosting provider.
