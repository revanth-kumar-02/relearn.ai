# ReLearn.ai - Complete Feature List

ReLearn.ai is a comprehensive, AI-powered learning and collaboration platform designed to optimize study workflows, facilitate team learning, and keep users engaged through gamification and intelligent automation. 

Below is a detailed breakdown of the features implemented in the application:

## 🤖 AI-Powered Learning
* **Dynamic Learning Plans**: Users can automatically generate custom daily study schedules (e.g., 30-Day Circuit Theory) using Gemini AI.
* **AI Chat Assistant (ChatBot)**: A floating AI tutor that provides instant explanations, answers questions, and helps users understand complex topics within their current workspace.
* **Intelligent Goal Setting**: Auto-calculated daily goal minutes and task distribution based on the chosen subject and timeframe.

## 🤝 Collaboration & Team Hub
* **Real-time Peer Search**: Search and discover other registered ReLearn.ai users dynamically across the platform.
* **Team Plans**: Convert individual learning plans into collaborative "Team Plans" where multiple users can contribute.
* **Invite System**: Send invitations to peers to join specific learning workspaces.
* **Live Presence & Cursors**: See who is currently online and active within a shared learning space.
* **Shared Progress Tracking**: Monitor overall team progression and recent activity logs within the Team Hub.

## ⚡ Offline-First Architecture & Sync Engine
* **Local Persistence (StorageService)**: Uses heavily optimized `localStorage` with XOR obfuscation to store user data securely on the device.
* **Background Auto-Sync**: Automatically pushes local changes to the Supabase cloud when internet connectivity is restored.
* **Silent Auto-Healing**: Intelligently handles database conflicts (e.g., foreign key constraints) by quietly re-queueing parent and child records without interrupting the user.
* **Conflict Resolution (LWW)**: Uses Last-Write-Wins logic to merge offline edits seamlessly with the server.
* **Offline Indicators**: Unobtrusive UI indicators let users know when they are operating without an internet connection.

## 📚 Study Modules & Tools
* **Flashcards Module**: Create, study, and flip interactive flashcards for spaced repetition.
* **Quiz Module**: Auto-generated or manual quizzes to test knowledge retention.
* **Cheat Sheets**: Quick-reference markdown notes for rapid review.
* **Video Resources**: Integrated educational video links related to the current learning topic.
* **Study Timer (Pomodoro)**: Built-in focus timers to keep users on track during study sessions.
* **Study Rooms (Virtual)**: Dedicated collaborative rooms where teams can study together in real-time.

## 📓 Personal Growth & Logging
* **Learning Diary**: A persistent journal where users can document their daily takeaways, struggles, and conceptual breakthroughs.
* **Gratitude Log**: A dedicated space to track positive moments and maintain a healthy, motivated mindset during intensive study periods.

## 🎮 Gamification & Engagement
* **XP & Leveling System**: Earn Experience Points (XP) for completing tasks, finishing plans, and collaborating.
* **Dynamic Animations**: Custom `motion/react` animations, including XP drop effects, confetti, and smooth page transitions.

## 🎨 Premium UI/UX & Design
* **Glassmorphism Aesthetic**: Beautiful, translucent UI components that adapt to both light and dark themes.
* **Command Palette**: A macOS Spotlight-style global search (`Cmd+K` or `Ctrl+K`) for lightning-fast navigation across the app.
* **Responsive Layout**: A fully adaptive interface featuring a collapsible desktop sidebar and a bottom navigation bar for mobile devices.
* **Haptic Feedback**: Integrated micro-vibrations/haptics on interactions to make the app feel incredibly tactile and responsive on supported devices.
* **Custom Overlays**: Beautiful, native-feeling modal overlays that completely replace standard browser alerts.

## ⚙️ Administration & Security
* **Admin Dashboard**: Specialized route and palette for administrators to manage users and platform data.
* **Supabase Integration**: Secure PostgreSQL backend handling authentication, live updates, and persistent user profiles.
* **Storage Optimization**: Automatic Base64 stripping and cleanup routines to prevent local browser storage from overflowing.
