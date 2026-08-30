import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import Icon from './Icon';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // SEO & Meta title management
    const originalTitle = document.title;
    document.title = '404 - Page Not Found | Relearn.ai';

    let metaRobots = document.querySelector('meta[name="robots"]');
    let createdMeta = false;
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      metaRobots.setAttribute('content', 'noindex, follow');
      document.head.appendChild(metaRobots);
      createdMeta = true;
    } else {
      metaRobots.setAttribute('content', 'noindex, follow');
    }

    return () => {
      document.title = originalTitle;
      if (createdMeta && metaRobots && metaRobots.parentNode) {
        metaRobots.parentNode.removeChild(metaRobots);
      }
    };
  }, []);

  // Motion variants with reduced motion support
  const floatAnimation = shouldReduceMotion
    ? {}
    : {
        y: [0, -10, 0],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };

  const planetAnimation = shouldReduceMotion
    ? {}
    : {
        y: [0, -6, 0],
        rotate: [0, 4, 0],
        transition: {
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };

  const paperPlaneAnimation = shouldReduceMotion
    ? {}
    : {
        y: [0, -12, 0],
        x: [0, 6, 0],
        rotate: [0, 8, 0],
        transition: {
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };

  const pageFloatAnimation = shouldReduceMotion
    ? {}
    : {
        y: [0, -8, 0],
        rotate: [-3, 3, -3],
        transition: {
          duration: 4.5,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };

  const pulseStar = (delay: number) =>
    shouldReduceMotion
      ? {}
      : {
          opacity: [0.3, 1, 0.3],
          scale: [0.85, 1.15, 0.85],
          transition: {
            duration: 3,
            repeat: Infinity,
            delay,
            ease: 'easeInOut' as const,
          },
        };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#F5F3FF] via-[#EDE9FE] to-[#E0E7FF] dark:from-[#0B0D1B] dark:via-[#131127] dark:to-[#0B0D1B] text-text-primary-light dark:text-white transition-colors duration-500 font-sans">
      {/* Background Glow Overlay in Dark Mode */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent dark:from-indigo-600/20 dark:via-purple-900/10 dark:to-transparent pointer-events-none z-0" />

      {/* Header with Relearn.ai Branding */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-20">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-2xl p-1 transition-all"
          aria-label="Relearn.ai Home"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
            <Icon name="school" className="text-2xl" />
          </div>
          <span className="text-xl font-black tracking-tight text-text-primary-light dark:text-white font-display">
            Relearn.ai
          </span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-6 py-4 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center flex-1 relative z-10">
        
        {/* Left Column: Relearn.ai Astronaut Illustration */}
        <div className="lg:col-span-6 flex justify-center items-center w-full">
          <motion.div
            animate={floatAnimation}
            className="w-full max-w-md lg:max-w-lg relative flex justify-center items-center select-none"
          >
            <svg
              viewBox="0 0 500 450"
              className="w-full h-auto drop-shadow-2xl overflow-visible"
              aria-label="Illustration of Relearn.ai astronaut character holding a map with a question mark on a small cratered planet"
              role="img"
            >
              <defs>
                {/* Astronaut Visor Gradient */}
                <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E1B4B" />
                  <stop offset="50%" stopColor="#2E1065" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>

                {/* Suit Shading Gradient */}
                <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#E2E8F0" />
                </linearGradient>

                {/* Purple Suit Accent Gradient */}
                <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="100%" stopColor="#6D28D9" />
                </linearGradient>

                {/* Asteroid Base Gradient */}
                <linearGradient id="asteroidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4C1D95" />
                  <stop offset="60%" stopColor="#3730A3" />
                  <stop offset="100%" stopColor="#1E1B4B" />
                </linearGradient>

                {/* Crater Gradient */}
                <linearGradient id="craterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E1035" />
                  <stop offset="100%" stopColor="#2E1065" />
                </linearGradient>

                {/* Map Paper Gradient */}
                <linearGradient id="mapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FEF3C7" />
                  <stop offset="100%" stopColor="#FDE68A" />
                </linearGradient>

                {/* Ringed Planet Gradient */}
                <linearGradient id="ringedPlanetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#A78BFA" />
                  <stop offset="100%" stopColor="#6D28D9" />
                </linearGradient>

                {/* Soft Glow Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Stars */}
              <g className="stars">
                {/* Star 1 */}
                <motion.path
                  animate={pulseStar(0)}
                  d="M70 120 L73 127 L80 130 L73 133 L70 140 L67 133 L60 130 L67 127 Z"
                  fill="#A78BFA"
                />
                {/* Star 2 */}
                <motion.path
                  animate={pulseStar(1)}
                  d="M150 40 L152 45 L157 47 L152 49 L150 54 L148 49 L143 47 L148 45 Z"
                  fill="#C4B5FD"
                />
                {/* Star 3 */}
                <motion.path
                  animate={pulseStar(0.5)}
                  d="M330 110 L333 117 L340 120 L333 123 L330 130 L327 123 L320 120 L327 117 Z"
                  fill="#818CF8"
                />
                {/* Star 4 */}
                <motion.path
                  animate={pulseStar(1.5)}
                  d="M440 200 L442 205 L447 207 L442 209 L440 214 L438 209 L433 207 L438 205 Z"
                  fill="#A78BFA"
                />
                {/* Star 5 */}
                <motion.path
                  animate={pulseStar(0.8)}
                  d="M110 270 L112 273 L115 275 L112 277 L110 280 L108 277 L105 275 L108 273 Z"
                  fill="#DDD6FE"
                />
                {/* Tiny Dots */}
                <circle cx="40" cy="80" r="2" fill="#C4B5FD" opacity="0.8" />
                <circle cx="280" cy="40" r="2.5" fill="#818CF8" opacity="0.9" />
                <circle cx="420" cy="130" r="1.5" fill="#DDD6FE" opacity="0.7" />
                <circle cx="90" cy="200" r="2" fill="#A78BFA" opacity="0.8" />
              </g>

              {/* Floating Ringed Planet (Top Left) */}
              <motion.g animate={planetAnimation}>
                {/* Dashed Orbit Trail */}
                <path
                  d="M 60 75 Q 90 120 120 160"
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.4"
                />
                {/* Planet Sphere */}
                <circle cx="60" cy="65" r="22" fill="url(#ringedPlanetGrad)" />
                {/* Planet Ring */}
                <ellipse
                  cx="60"
                  cy="65"
                  rx="36"
                  ry="9"
                  fill="none"
                  stroke="#DDD6FE"
                  strokeWidth="3.5"
                  transform="rotate(-22 60 65)"
                  opacity="0.9"
                />
              </motion.g>

              {/* Floating Manuscript Pages with Dashed Path */}
              <motion.g animate={pageFloatAnimation}>
                {/* Trail */}
                <path
                  d="M 270 90 Q 230 110 200 135"
                  fill="none"
                  stroke="#C4B5FD"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.5"
                />
                {/* Page 1 */}
                <g transform="translate(240, 75) rotate(-12)">
                  <rect x="0" y="0" width="22" height="28" rx="2" fill="#FFFFFF" opacity="0.9" />
                  <path d="M 16 0 L 22 6 L 16 6 Z" fill="#E2E8F0" />
                  <line x1="4" y1="8" x2="16" y2="8" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="4" y1="13" x2="14" y2="13" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="4" y1="18" x2="18" y2="18" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
                </g>
                {/* Page 2 */}
                <g transform="translate(210, 115) rotate(15)">
                  <rect x="0" y="0" width="18" height="24" rx="2" fill="#FFFFFF" opacity="0.85" />
                  <line x1="3" y1="7" x2="13" y2="7" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="3" y1="12" x2="11" y2="12" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="3" y1="17" x2="14" y2="17" stroke="#A78BFA" strokeWidth="1.2" strokeLinecap="round" />
                </g>
              </motion.g>

              {/* Origami Paper Airplane (Top Right) */}
              <motion.g animate={paperPlaneAnimation}>
                <g transform="translate(390, 50) rotate(12) scale(0.95)">
                  <polygon points="0,20 35,0 20,28" fill="url(#paperPlaneGrad)" />
                  <polygon points="35,0 20,28 15,18" fill="#5B21B6" opacity="0.7" />
                  <polygon points="0,20 35,0 15,18" fill="#8B5CF6" />
                  {/* Dashed trail */}
                  <path
                    d="M -25 35 Q -10 25 0 20"
                    fill="none"
                    stroke="#C4B5FD"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                </g>
              </motion.g>

              {/* Main Planetoid / Asteroid Base */}
              <g className="asteroid">
                {/* Shadow glow under asteroid */}
                <ellipse cx="200" cy="385" rx="100" ry="20" fill="#1E1B4B" opacity="0.3" filter="url(#glow)" />

                {/* Main Sphere */}
                <circle cx="200" cy="315" r="75" fill="url(#asteroidGrad)" />

                {/* Asteroid Surface Craters */}
                {/* Crater 1 */}
                <ellipse cx="160" cy="300" rx="16" ry="10" fill="url(#craterGrad)" />
                <path d="M 144 300 A 16 10 0 0 0 176 300" fill="none" stroke="#6D28D9" strokeWidth="2" opacity="0.6" />

                {/* Crater 2 */}
                <ellipse cx="220" cy="340" rx="20" ry="12" fill="url(#craterGrad)" />
                <path d="M 200 340 A 20 12 0 0 0 240 340" fill="none" stroke="#6D28D9" strokeWidth="2" opacity="0.6" />

                {/* Crater 3 */}
                <ellipse cx="170" cy="355" rx="12" ry="7" fill="url(#craterGrad)" />

                {/* Crater 4 */}
                <ellipse cx="245" cy="295" rx="14" ry="8" fill="url(#craterGrad)" />

                {/* Crater 5 */}
                <ellipse cx="130" cy="335" rx="10" ry="6" fill="url(#craterGrad)" />
              </g>

              {/* Directional Signpost (Right Side Mound) */}
              <g className="signpost">
                {/* Small Mound */}
                <ellipse cx="380" cy="345" rx="35" ry="14" fill="#3730A3" />
                <ellipse cx="370" cy="343" rx="8" ry="4" fill="url(#craterGrad)" />

                {/* Sign Post Pole */}
                <rect x="376" y="260" width="8" height="85" rx="2" fill="url(#accentGrad)" />

                {/* Arrow 1: Pointing Left */}
                <g transform="translate(330, 265)">
                  <path d="M 10 0 L 50 0 L 50 20 L 10 20 L 0 10 Z" fill="#6D28D9" />
                  <path d="M 12 2 L 48 2 L 48 18 L 12 18 L 3 10 Z" fill="#7C3AED" />
                  <text x="24" y="14" fontSize="9" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
                    ←
                  </text>
                </g>

                {/* Arrow 2: Pointing Right */}
                <g transform="translate(370, 290)">
                  <path d="M 0 0 L 40 0 L 50 10 L 40 20 L 0 20 Z" fill="#4C1D95" />
                  <path d="M 2 2 L 38 2 L 47 10 L 38 18 L 2 18 Z" fill="#5B21B6" />
                  <text x="22" y="14" fontSize="9" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
                    →
                  </text>
                </g>
              </g>

              {/* Relearn.ai Astronaut Character (Center Focal Point) */}
              <g className="astronaut" transform="translate(0, 0)">
                {/* Backpack (Life Support System) */}
                <rect x="155" y="170" width="30" height="50" rx="8" fill="url(#accentGrad)" />
                <rect x="150" y="180" width="8" height="30" rx="3" fill="#A78BFA" />

                {/* Suit Torso / Body */}
                <path
                  d="M 175 165 C 165 175 165 220 175 230 C 185 235 215 235 225 230 C 235 220 235 175 225 165 Z"
                  fill="url(#suitGrad)"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                />

                {/* Purple Shoulder Pads */}
                <circle cx="170" cy="178" r="10" fill="url(#accentGrad)" />
                <circle cx="230" cy="178" r="10" fill="url(#accentGrad)" />

                {/* Chest Control Panel */}
                <rect x="188" y="180" width="24" height="18" rx="4" fill="#1E1B4B" />
                <circle cx="195" cy="189" r="2.5" fill="#38BDF8" />
                <circle cx="204" cy="189" r="2.5" fill="#A78BFA" />

                {/* Utility Belt */}
                <rect x="176" y="215" width="48" height="7" rx="3" fill="url(#accentGrad)" />
                <rect x="194" y="213" width="12" height="11" rx="2" fill="#FDE68A" />

                {/* Sitting Legs */}
                {/* Left Leg */}
                <path
                  d="M 175 225 C 160 230 150 250 160 265 C 170 270 185 260 185 245 Z"
                  fill="url(#suitGrad)"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />
                {/* Left Boot */}
                <path d="M 152 260 C 150 272 170 275 175 265 Z" fill="#6D28D9" />

                {/* Right Leg */}
                <path
                  d="M 225 225 C 240 230 250 250 240 265 C 230 270 215 260 215 245 Z"
                  fill="url(#suitGrad)"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />
                {/* Right Boot */}
                <path d="M 248 260 C 250 272 230 275 225 265 Z" fill="#6D28D9" />

                {/* Astronaut Helmet */}
                {/* Outer Helmet */}
                <circle cx="200" cy="142" r="44" fill="url(#suitGrad)" stroke="#E2E8F0" strokeWidth="2" />
                {/* Side Earpieces */}
                <rect x="152" y="136" width="7" height="14" rx="3" fill="#6D28D9" />
                <rect x="241" y="136" width="7" height="14" rx="3" fill="#6D28D9" />

                {/* Dark Visor Glass */}
                <ellipse cx="200" cy="142" rx="34" ry="24" fill="url(#visorGrad)" />
                {/* Visor Glare / Reflection */}
                <path
                  d="M 172 134 A 30 20 0 0 1 216 126"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  opacity="0.75"
                />

                {/* Glowing Purple/Cyan Oval Eyes inside Visor */}
                <ellipse cx="188" cy="143" rx="5" ry="7" fill="#A78BFA" filter="url(#glow)" />
                <ellipse cx="212" cy="143" rx="5" ry="7" fill="#A78BFA" filter="url(#glow)" />
                <ellipse cx="189" cy="142" rx="2" ry="3" fill="#FFFFFF" />
                <ellipse cx="213" cy="142" rx="2" ry="3" fill="#FFFFFF" />

                {/* Arms & Gloved Hands Holding Map */}
                {/* Left Arm */}
                <path d="M 168 185 C 160 200 172 215 182 210" fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />
                {/* Right Arm */}
                <path d="M 232 185 C 240 200 228 215 218 210" fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" />

                {/* Open Map / Book Held by Astronaut */}
                <g transform="translate(170, 192)">
                  {/* Map Shadow */}
                  <polygon points="0,5 60,5 55,42 -5,42" fill="#1E1B4B" opacity="0.25" />

                  {/* Left Folded Page */}
                  <polygon points="2,2 30,0 28,36 0,38" fill="url(#mapGrad)" stroke="#F59E0B" strokeWidth="0.8" />
                  {/* Subtle Map Lines Left Page */}
                  <line x1="6" y1="8" x2="24" y2="6" stroke="#D97706" strokeWidth="1" opacity="0.6" />
                  <line x1="6" y1="14" x2="22" y2="12" stroke="#D97706" strokeWidth="1" opacity="0.6" />
                  <line x1="6" y1="20" x2="20" y2="19" stroke="#D97706" strokeWidth="1" opacity="0.6" />

                  {/* Right Folded Page with Folded Corner */}
                  <polygon points="30,0 58,3 54,39 28,36" fill="url(#mapGrad)" stroke="#F59E0B" strokeWidth="0.8" />
                  {/* Folded Top-Right Corner */}
                  <polygon points="52,3.5 58,3 57,9" fill="#FBBF24" />

                  {/* Center Crease */}
                  <line x1="30" y1="0" x2="28" y2="36" stroke="#D97706" strokeWidth="1.5" />

                  {/* Prominent Purple Question Mark '?' on Map */}
                  <text
                    x="43"
                    y="25"
                    fontSize="21"
                    fontWeight="900"
                    fill="#6D28D9"
                    textAnchor="middle"
                    fontFamily="sans-serif"
                    className="font-black"
                  >
                    ?
                  </text>
                </g>

                {/* White Gloved Hands Over Map */}
                <circle cx="172" cy="212" r="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
                <circle cx="228" cy="212" r="6" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
              </g>
            </svg>
          </motion.div>
        </div>

        {/* Right Column: 404 Typography & Action Buttons */}
        <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left z-10">
          {/* Big Bold 404 Heading */}
          <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-600 to-indigo-500 dark:from-indigo-400 dark:via-purple-400 dark:to-primary font-display leading-none drop-shadow-sm">
            404
          </h1>

          {/* Headline Subtitle */}
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text-primary-light dark:text-white mt-3 mb-3 tracking-tight">
            Oops! This page got lost.
          </h2>

          {/* Description Paragraph */}
          <p className="text-base sm:text-lg text-text-secondary-light dark:text-slate-300 max-w-md leading-relaxed">
            The page you're looking for doesn't exist or may have been moved.
          </p>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full sm:w-auto">
            {/* Back to Home Button */}
            <motion.button
              whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -2 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-base transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center gap-2.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
              aria-label="Back to Home"
            >
              <Icon name="home" className="text-xl" />
              <span>Back to Home</span>
            </motion.button>

            {/* Go to Dashboard Button */}
            <motion.button
              whileHover={shouldReduceMotion ? {} : { scale: 1.03, y: -2 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 border border-gray-200 dark:border-white/20 text-text-primary-light dark:text-white font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2.5 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              aria-label="Go to Dashboard"
            >
              <Icon name="grid_view" className="text-xl" />
              <span>Go to Dashboard</span>
            </motion.button>
          </div>
        </div>
      </main>

      {/* Bottom Rolling Space Dunes / Planet Surface Wave Landscape */}
      <footer className="w-full relative z-0 leading-none pointer-events-none mt-auto">
        <svg
          viewBox="0 0 1440 160"
          className="w-full h-24 sm:h-32 md:h-40 block"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Back Dune Layer */}
          <path
            d="M 0 80 Q 360 120 720 70 Q 1080 20 1440 80 L 1440 160 L 0 160 Z"
            fill="currentColor"
            className="text-purple-300/40 dark:text-[#16132A]/80"
          />
          {/* Front Dune Layer */}
          <path
            d="M 0 110 Q 480 50 960 110 Q 1200 140 1440 90 L 1440 160 L 0 160 Z"
            fill="currentColor"
            className="text-purple-400/30 dark:text-[#1E1A3A]"
          />
        </svg>
      </footer>
    </div>
  );
};

export default NotFound;
