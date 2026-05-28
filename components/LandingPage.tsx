import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import Icon from './common/Icon';

// Rotating words in hero section
const HERO_PHRASES = [
  "Adaptive AI Learning",
  "Your Knowledge Matrix",
  "Personalized Skill Evolution",
  "Intelligent Career Growth"
];

// Steps for the interactive learning timeline
const JOURNEY_STEPS = [
  {
    step: "01",
    title: "Select Career Goal",
    desc: "Define what you want to achieve, from engineering roles to creative mastery.",
    icon: "target",
    color: "from-blue-400 to-indigo-400"
  },
  {
    step: "02",
    title: "Generate AI Pathway",
    desc: "Our neural generator models a customized syllabus tailored to your pacing.",
    icon: "auto_awesome",
    color: "from-indigo-400 to-purple-400"
  },
  {
    step: "03",
    title: "Learn in Workspace",
    desc: "A singular unified environment containing notes, videos, and active AI prompts.",
    icon: "desktop_windows",
    color: "from-purple-400 to-pink-400"
  },
  {
    step: "04",
    title: "Build Projects",
    desc: "Synthesize facts into direct capability through hands-on project milestones.",
    icon: "terminal",
    color: "from-pink-400 to-rose-400"
  },
  {
    step: "05",
    title: "Track Evolution",
    desc: "Inspect your resonance levels and watch your skill graph dynamically adapt.",
    icon: "insights",
    color: "from-rose-400 to-orange-400"
  },
  {
    step: "06",
    title: "Achieve Mastery",
    desc: "Unlock new credentials, build community rooms, and accelerate your career.",
    icon: "school",
    color: "from-teal-400 to-emerald-400"
  }
];

// Framer Motion variants for highly-performant staggered card grids
const STAGGER_CONTAINER_VARIANTS = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const STAGGER_CARD_VARIANTS = {
  hidden: { opacity: 0, y: 25 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
  }
};

// Preset domains for Concept Collision simulation
const COLLISION_DOMAINS_A = [
  "Neural Networks",
  "Classical Philosophy",
  "Quantum Computing",
  "Microeconomics"
];

const COLLISION_DOMAINS_B = [
  "Creative Writing",
  "Music Harmony Theory",
  "Behavioral Psychology",
  "Generative Architecture"
];

const COLLISION_RESULTS: Record<string, { title: string; desc: string; resonance: number; nextSteps: string }> = {
  "Neural Networks x Creative Writing": {
    title: "Narrative Synthesis Networks",
    desc: "Employ generative transformers to map classic story structures into multi-layered semantic graphs, enabling dynamic character prompt engineering.",
    resonance: 94,
    nextSteps: "Study Sequence-to-Sequence NLP Architectures"
  },
  "Neural Networks x Music Harmony Theory": {
    title: "Harmonic Neural Orchestration",
    desc: "Train self-attention nodes to recognize counterpoint progressions, synthesizing classical fugues with contemporary electronic timbres.",
    resonance: 97,
    nextSteps: "Learn Fourier Transform Audio Processing"
  },
  "Neural Networks x Behavioral Psychology": {
    title: "Cognitive Feedback Loops",
    desc: "Build adaptive reinforcement learning agents modeling human dopamine spikes to customize spaced-repetition schedules.",
    resonance: 91,
    nextSteps: "Examine Proximal Policy Optimization Algorithms"
  },
  "Neural Networks x Generative Architecture": {
    title: "Algorithmic Spatial Optimization",
    desc: "Combine procedural structure grids with generative adversarial models to co-design energy-efficient biomimetic urban frames.",
    resonance: 95,
    nextSteps: "Review 3D Spatial Geometry Generators"
  },
  "Classical Philosophy x Creative Writing": {
    title: "Socratic Narrative Dialectics",
    desc: "Design dialogue trees utilizing ancient classical logic styles to prompt deeper reader introspection and character debate.",
    resonance: 89,
    nextSteps: "Read Socratic Dialogues & Epic Literature"
  },
  "Classical Philosophy x Music Harmony Theory": {
    title: "Pythagorean Resonance Ethics",
    desc: "Explore the ancient concept of Musica Universalis through dynamic mathematical intervals representing metaphysical philosophical virtues.",
    resonance: 93,
    nextSteps: "Explore Pythagorean Tuning Systems"
  },
  "Classical Philosophy x Behavioral Psychology": {
    title: "Stoic Behavioral Conditioning",
    desc: "Reframe modern cognitive behavioral therapy protocols using Marcus Aurelius's Meditations, optimizing emotional resilience metrics.",
    resonance: 96,
    nextSteps: "Analyze Stoic Ethics & CBT Foundations"
  },
  "Classical Philosophy x Generative Architecture": {
    title: "Existential Spatial Frameworks",
    desc: "Conceptualize living habitats engineered to promote meditative isolation, basing dimensions on traditional Hermetic geometries.",
    resonance: 88,
    nextSteps: "Review Phenomenological Architectural Principles"
  },
  "Quantum Computing x Creative Writing": {
    title: "Superposition Narrative Matrices",
    desc: "Model branching choose-your-own-adventure storytelling where paragraphs exist in quantum-like states until read (measured).",
    resonance: 90,
    nextSteps: "Study Quantum Probability Models"
  },
  "Quantum Computing x Music Harmony Theory": {
    title: "Qubit Tonal Superpositions",
    desc: "Synthesize chords where harmonics occupy multiple keys simultaneously, resolving only when specific mathematical filters are applied.",
    resonance: 92,
    nextSteps: "Explore Quantum Gate Tone Generators"
  },
  "Quantum Computing x Behavioral Psychology": {
    title: "Quantum Cognitive Decisions",
    desc: "Model complex, seemingly irrational human purchase behaviors using quantum interference states instead of traditional Bayesian probability.",
    resonance: 94,
    nextSteps: "Read Quantum Decision Theory Papers"
  },
  "Quantum Computing x Generative Architecture": {
    title: "Quantum Entangled Grid Systems",
    desc: "Design structural elements that simulate quantum entanglement: altering one room's layout dynamically influences lighting elsewhere.",
    resonance: 91,
    nextSteps: "Review Parametric Building Algorithms"
  },
  "Microeconomics x Creative Writing": {
    title: "Game-Theoretic Plot Designs",
    desc: "Write thriller scripts where characters negotiate under Nash Equilibrium constraints, turning conflicts into strategic payoffs.",
    resonance: 87,
    nextSteps: "Read Microeconomic Theory and Game Theory basics"
  },
  "Microeconomics x Music Harmony Theory": {
    title: "Resource Allocation Harmonics",
    desc: "Map financial supply-demand curves directly into audio pitch frequencies, listening to market movements as continuous sonatas.",
    resonance: 86,
    nextSteps: "Study Synthesizer Modulation Systems"
  },
  "Microeconomics x Behavioral Psychology": {
    title: "Nudge Architecture Synthetics",
    desc: "Design user acquisition models applying cognitive biases to optimize conversion funnels without restricting core personal agency.",
    resonance: 95,
    nextSteps: "Explore Behavioral Nudge Case Studies"
  },
  "Microeconomics x Generative Architecture": {
    title: "Procedural Rent Gradient Layouts",
    desc: "Generate residential zoning models that react procedurally to localized land value variables, optimizing for public park access.",
    resonance: 93,
    nextSteps: "Analyze Urban Planning Density Algortihms"
  }
};

// Skill matrix nodes
const MATRIX_NODES = [
  { id: "ml", name: "Machine Learning", resonance: 92, level: "Advanced", color: "from-blue-500 to-indigo-500", x: 25, y: 35 },
  { id: "ux", name: "UI Interaction", resonance: 88, level: "Intermediate", color: "from-cyan-500 to-teal-500", x: 60, y: 25 },
  { id: "sys", name: "System Architecture", resonance: 79, level: "Competent", color: "from-indigo-600 to-purple-600", x: 45, y: 70 },
  { id: "web", name: "Frontend Engines", resonance: 95, level: "Expert", color: "from-pink-500 to-rose-500", x: 80, y: 65 },
  { id: "data", name: "Data Engineering", resonance: 64, level: "Novice", color: "from-orange-500 to-amber-500", x: 15, y: 80 }
];

// Interactive Flip Flashcard Component
const InteractiveFlashcard: React.FC<{ front: string; back: string }> = ({ front, back }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div 
      onClick={() => setFlipped(!flipped)}
      className="w-full max-w-[280px] h-28 [perspective:1000px] cursor-pointer my-2 select-none"
    >
      <div 
        className={`relative w-full h-full text-center transition-transform duration-500 [transform-style:preserve-3d] ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* Front Side */}
        <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-indigo-50/50 to-primary/5 dark:from-surface-dark dark:to-primary/10 border border-primary/20 dark:border-primary/10 p-4 flex flex-col justify-between [backface-visibility:hidden]">
          <div className="flex items-center justify-between text-[9px] font-bold text-primary font-display uppercase tracking-wider">
            <span>Flashcard (Front)</span>
            <Icon name="flip" className="text-xs" />
          </div>
          <div className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark my-auto">
            {front}
          </div>
          <div className="text-[8px] text-text-secondary-light dark:text-text-secondary-dark font-medium italic">
            Click to reveal answer
          </div>
        </div>

        {/* Back Side */}
        <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-emerald-50/50 to-secondary/5 dark:from-surface-dark dark:to-secondary/10 border border-secondary/20 dark:border-secondary/10 p-4 flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex items-center justify-between text-[9px] font-bold text-secondary font-display uppercase tracking-wider">
            <span>Answer (Back)</span>
            <Icon name="flip" className="text-xs" />
          </div>
          <div className="text-xs font-mono font-bold text-text-primary-light dark:text-text-primary-dark my-auto p-1 bg-white/60 dark:bg-black/30 rounded border border-secondary/10">
            {back}
          </div>
          <div className="text-[8px] text-text-secondary-light dark:text-text-secondary-dark font-medium italic">
            Click to flip back
          </div>
        </div>
      </div>
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Scroll effect for Navbar
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // State for scroll-tracking active section
  const [activeSection, setActiveSection] = useState<string>('hero');
  useEffect(() => {
    const sections = ['hero', 'features', 'workspace', 'matrix', 'collision', 'about'];
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -65% 0px',
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  // Programmatic smooth scroll helper for HashRouter compatibility
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Text rotation effect for Hero Subheading
  const [phraseIndex, setPhraseIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % HERO_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Mouse Parallax for Hero Graphics
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    // Normalize coordinates from -1 to 1
    const x = (e.clientX - rect.left) / rect.width * 2 - 1;
    const y = (e.clientY - rect.top) / rect.height * 2 - 1;
    setMousePos({ x, y });
  };

  // State for AI Workspace Interactive Showcase
  const [workspaceTab, setWorkspaceTab] = useState<'notes' | 'ai' | 'milestones'>('notes');
  const [chatLog, setChatLog] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: "Hello! I noticed you are exploring 'Deep Learning Pathways'. Would you like me to map out a Concept Collision report connecting Neural Networks to your other interest in Graphic Design?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const simulateAIChat = (promptText: string, responseText: string) => {
    if (isTyping) return;
    setChatLog(prev => [...prev, { sender: 'user', text: promptText }]);
    setIsTyping(true);

    setTimeout(() => {
      setChatLog(prev => [...prev, { sender: 'ai', text: responseText }]);
      setIsTyping(false);
    }, 1500);
  };

  // State for Concept Collision simulator
  const [collisionA, setCollisionA] = useState(COLLISION_DOMAINS_A[0]);
  const [collisionB, setCollisionB] = useState(COLLISION_DOMAINS_B[0]);
  const [colliding, setColliding] = useState(false);
  const [collisionResult, setCollisionResult] = useState<typeof COLLISION_RESULTS[string] | null>(null);

  const triggerCollision = () => {
    setColliding(true);
    setCollisionResult(null);
    setTimeout(() => {
      const key = `${collisionA} x ${collisionB}`;
      setCollisionResult(COLLISION_RESULTS[key] || {
        title: "Interdisciplinary Synthesis",
        desc: `Synthesizing ${collisionA} with ${collisionB} to create a specialized cross-domain pathway.`,
        resonance: 90,
        nextSteps: "Generate custom roadmap in ReLearn.ai"
      });
      setColliding(false);
    }, 1200);
  };

  // State for Knowledge Matrix
  const [selectedNode, setSelectedNode] = useState<typeof MATRIX_NODES[0] | null>(MATRIX_NODES[0]);



  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark font-sans overflow-x-hidden selection:bg-primary/30 select-none antialiased relative">
      {/* Mesh Ambient Glow Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1600px] h-[900px] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-25%] left-[-15%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,102,255,0.12)_0%,rgba(99,102,241,0.03)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(0,102,255,0.2)_0%,rgba(99,102,241,0.06)_50%,transparent_70%)] animate-glow-drift-1" />
        <div className="absolute top-[5%] right-[-15%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(8,131,149,0.12)_0%,rgba(147,51,234,0.03)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(8,131,149,0.2)_0%,rgba(147,51,234,0.06)_50%,transparent_70%)] animate-glow-drift-2" />
        <div className="absolute top-[35%] left-[15%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.06)_0%,rgba(0,102,255,0.02)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.12)_0%,rgba(0,102,255,0.04)_50%,transparent_70%)] animate-glow-drift-3" />
        {/* Futuristic grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-80" />
      </div>

      {/* 1. FLOATING NAVBAR */}
      <header 
        className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 ${
          scrolled 
            ? 'py-4 bg-white/70 dark:bg-background-dark/70 backdrop-blur-xl border-b border-border-light dark:border-border-dark shadow-lg shadow-black/5' 
            : 'py-6 bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Icon name="school" className="text-2xl" />
            </div>
            <span className="text-xl font-bold tracking-tight font-display bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ReLearn.ai
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 relative">
            {[
              { name: 'Features', href: '#features', id: 'features' },
              { name: 'Workspace', href: '#workspace', id: 'workspace' },
              { name: 'Pathway', href: '#matrix', id: 'matrix' },
              { name: 'About', href: '#about', id: 'about' }
            ].map((item) => {
              const isActive = activeSection === item.id || (item.id === 'matrix' && activeSection === 'collision');
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.id)}
                  className={`relative py-1.5 text-sm font-semibold transition-colors ${
                    isActive 
                      ? 'text-primary dark:text-primary-dark' 
                      : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-primary dark:hover:text-primary-dark'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeNavUnderline"
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{item.name}</span>
                </a>
              );
            })}
          </nav>

          {/* Desktop Nav CTAs */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark hover:text-primary transition-colors"
                >
                  Log In
                </button>
                <button 
                  onClick={() => navigate('/signup')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] glow-primary"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 text-text-secondary-light dark:text-text-secondary-dark"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Icon name={mobileMenuOpen ? "close" : "menu"} className="text-2xl" />
          </button>
        </div>

        {/* Mobile Nav Links Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 w-full bg-white dark:bg-background-dark/95 backdrop-blur-2xl border-b border-border-light dark:border-border-dark py-6 px-8 flex flex-col gap-5 md:hidden shadow-xl"
            >
              {[
                { name: 'Features', href: '#features', id: 'features' },
                { name: 'Workspace', href: '#workspace', id: 'workspace' },
                { name: 'Pathway', href: '#matrix', id: 'matrix' },
                { name: 'About', href: '#about', id: 'about' }
              ].map((item) => {
                const isActive = activeSection === item.id || (item.id === 'matrix' && activeSection === 'collision');
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      scrollToSection(e, item.id);
                    }}
                    className={`text-base font-bold transition-colors py-2.5 px-4 rounded-xl ${
                      isActive 
                        ? 'text-primary bg-primary/5 dark:text-primary-dark dark:bg-primary-dark/5' 
                        : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-stone-50 dark:hover:bg-stone-900/50'
                    }`}
                  >
                    {item.name}
                  </a>
                );
              })}
              
              <div className="h-[1px] bg-border-light dark:bg-border-dark my-2" />
              
              {user ? (
                <button 
                  onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-md text-center"
                >
                  Go to Dashboard
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                    className="w-full py-3 rounded-xl border border-border-light dark:border-border-dark text-center font-semibold text-sm"
                  >
                    Log In
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-bold shadow-md text-center"
                  >
                    Get Started
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* 2. HERO SECTION */}
      <section 
        id="hero"
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative min-h-screen pt-36 pb-20 px-6 flex flex-col items-center justify-center text-center max-w-[1280px] mx-auto z-10 scroll-mt-24"
      >
        <div className="max-w-[800px] space-y-8 mb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 dark:border-primary/10 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary font-display">
              Introducing Adaptive Learning 2.0
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-black font-display tracking-tight text-text-primary-light dark:text-text-primary-dark leading-[1.08] max-w-[760px] mx-auto">
            Learn Smarter. <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-indigo-500 bg-clip-text text-transparent">
              Build Your Future Faster.
            </span>
          </h1>

          {/* Subheading with rotating phrase */}
          <div className="h-8 flex items-center justify-center text-lg sm:text-2xl font-bold font-display text-primary/95 dark:text-secondary-light">
            <AnimatePresence mode="wait">
              <motion.span
                key={phraseIndex}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                {HERO_PHRASES[phraseIndex]}
              </motion.span>
            </AnimatePresence>
          </div>

          <p className="text-base sm:text-lg text-text-secondary-light dark:text-text-secondary-dark max-w-[620px] mx-auto font-medium leading-relaxed">
            ReLearn.ai transforms random article browsing and fragmented online lectures into structured, AI-guided learning pathways. Set your career targets and watch the ecosystem adapt in real-time.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button 
              onClick={() => navigate(user ? '/dashboard' : '/signup')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-xl shadow-primary/25 hover:shadow-primary/45 transition-all hover:scale-[1.02] active:scale-[0.98] glow-primary flex items-center justify-center gap-2"
            >
              <span>{user ? 'Enter ReLearn.ai' : 'Get Started for Free'}</span>
              <Icon name="arrow_forward" className="text-lg" />
            </button>
            <a 
              href="#workspace"
              onClick={(e) => scrollToSection(e, 'workspace')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark font-bold text-base hover:bg-stone-50 dark:hover:bg-stone-900/60 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Explore Workspace
            </a>
          </div>
        </div>

        {/* Caption/Info block for the visualization */}
        <div className="text-center max-w-[600px] mx-auto space-y-2 mt-12 mb-4 px-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary font-mono">
            <Icon name="visibility" className="text-xs" />
            Interactive Workspace Preview
          </div>
          <p className="text-xs sm:text-sm text-text-secondary-light/80 dark:text-text-secondary-dark/70 font-semibold leading-relaxed">
            Move your cursor over the visualizer below to test the 3D neural mapping sync.
          </p>
        </div>

        {/* Interactive Futuristic Dashboard Visualization */}
        <div 
          className="relative w-full max-w-[960px] aspect-[16/10] sm:aspect-[16/9] rounded-3xl border border-white/20 dark:border-white/5 bg-white/40 dark:bg-surface-dark/40 backdrop-blur-xl p-3 sm:p-5 shadow-2xl shadow-black/10 overflow-hidden transform perspective-1000"
          style={{
            transform: `rotateY(${mousePos.x * 5}deg) rotateX(${mousePos.y * -5}deg)`,
            transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)'
          }}
        >
          {/* Dashboard Canvas mockup */}
          <div className="w-full h-full rounded-2xl border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark overflow-hidden flex flex-col relative">
            <style>{`
              @keyframes stroke-flow {
                to {
                  stroke-dashoffset: -20;
                }
              }
              .crawling-dash {
                stroke-dasharray: 6 4;
                animation: stroke-flow 1.5s linear infinite;
              }
            `}</style>

            {/* Mock Topbar */}
            <div className="h-10 border-b border-border-light dark:border-border-dark px-4 flex items-center justify-between bg-white dark:bg-surface-dark/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-black/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-black/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-black/10" />
                <span className="text-[10px] font-bold text-text-secondary-light/60 dark:text-text-secondary-dark/40 ml-4 font-mono">Workspace.relearn.ai</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-5 w-32 rounded bg-border-light dark:bg-border-dark/60 animate-pulse" />
                <div className="w-5 h-5 rounded-full bg-primary/20" />
              </div>
            </div>

            {/* Mock Dashboard Layout */}
            <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden relative">
              {/* Sidebar list mock */}
              <div className="col-span-3 hidden sm:flex flex-col gap-3 pr-2 border-r border-border-light dark:border-border-dark">
                <div className="h-6 rounded bg-primary/10 flex items-center px-2">
                  <span className="material-symbols-outlined text-[10px] text-primary mr-1.5">compass_calibration</span>
                  <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider">Active Pathways</span>
                </div>
                <div className="h-6 rounded hover:bg-stone-100 dark:hover:bg-stone-850 flex items-center px-2 opacity-80 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-[10px] text-text-secondary-light mr-1.5 flex-shrink-0">folder</span>
                  <span className="text-[10px] font-semibold text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap overflow-hidden text-ellipsis">LLM Fine-Tuning</span>
                </div>
                <div className="h-6 rounded hover:bg-stone-100 dark:hover:bg-stone-850 flex items-center px-2 opacity-80 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-[10px] text-text-secondary-light mr-1.5 flex-shrink-0">folder</span>
                  <span className="text-[10px] font-semibold text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap overflow-hidden text-ellipsis">Behavioral Economics</span>
                </div>
                <div className="h-6 rounded hover:bg-stone-100 dark:hover:bg-stone-850 flex items-center px-2 opacity-80 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-[10px] text-text-secondary-light mr-1.5 flex-shrink-0">folder</span>
                  <span className="text-[10px] font-semibold text-text-secondary-light dark:text-text-secondary-dark whitespace-nowrap overflow-hidden text-ellipsis">Generative Systems</span>
                </div>
              </div>

              {/* Main pathway view */}
              <div className="col-span-12 sm:col-span-9 flex flex-col gap-4 relative">
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">Pathway: Advanced Machine Learning</h3>
                    <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-medium">Est. Completion: 2 weeks • AI Adjusted Pace</p>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-secondary/15 text-[10px] font-extrabold text-secondary tracking-wider uppercase z-10 mr-12 sm:mr-0">Resonance: 96%</div>
                </div>

                {/* Pathway Roadmap SVG Graphic */}
                <div className="flex-1 w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark/20 p-4 relative overflow-hidden flex items-center justify-center">
                  <svg className="w-full h-full max-h-[220px]" viewBox="0 0 500 200">
                    {/* Glowing path lines */}
                    <path d="M 50,100 C 90,100 110,70 150,70 C 200,70 225,120 275,120 C 325,120 350,85 400,85 C 425,85 440,100 460,100" fill="none" stroke="url(#gradient-path)" strokeWidth="3" className="crawling-dash" />
                    
                    {/* Glowing nodes */}
                    <circle cx="50" cy="100" r="10" fill="#0066FF" filter="url(#glow-nodes)" className="cursor-pointer" />
                    <circle cx="150" cy="70" r="12" fill="#088395" filter="url(#glow-nodes)" className="cursor-pointer" />
                    <circle cx="275" cy="120" r="14" fill="#6366F1" filter="url(#glow-nodes)" className="cursor-pointer" />
                    <circle cx="400" cy="85" r="12" fill="#EC4899" filter="url(#glow-nodes)" className="cursor-pointer" />
                    <circle cx="460" cy="100" r="10" fill="#10B981" filter="url(#glow-nodes)" className="cursor-pointer" />

                    {/* Nodes text */}
                    <text x="50" y="128" textAnchor="middle" fill="currentColor" className="text-[8px] sm:text-[9px] font-bold">Foundations</text>
                    <text x="150" y="48" textAnchor="middle" fill="currentColor" className="text-[8px] sm:text-[9px] font-bold">Neural Networks</text>
                    <text x="275" y="152" textAnchor="middle" fill="currentColor" className="text-[8px] sm:text-[9px] font-bold">Transformers</text>
                    <text x="400" y="63" textAnchor="middle" fill="currentColor" className="text-[8px] sm:text-[9px] font-bold">RLHF Training</text>
                    <text x="460" y="128" textAnchor="middle" fill="currentColor" className="text-[8px] sm:text-[9px] font-bold">Mastery</text>
                    
                    {/* Definitions */}
                    <defs>
                      <linearGradient id="gradient-path" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0066FF" />
                        <stop offset="50%" stopColor="#088395" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                      <filter id="glow-nodes" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0066FF" floodOpacity="0.3" />
                      </filter>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            {/* Parallax Floating Cards overlaying the dashboard layout */}
            <div 
              className="absolute top-[28%] left-10 pointer-events-none hidden sm:block z-20"
              style={{
                transform: `translate(${mousePos.x * -18}px, ${mousePos.y * -18}px)`,
                transition: 'transform 0.1s ease-out'
              }}
            >
              <div className="p-4 rounded-2xl glass-card border border-primary/20 dark:border-primary/10 shadow-lg w-52 animate-float-slow">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-sm">psychology</span>
                  <span className="text-[10px] font-bold text-primary font-display uppercase tracking-wider">Concept Collision</span>
                </div>
                <h4 className="text-xs font-black tracking-tight leading-snug">Math + Aesthetics</h4>
                <p className="text-[9px] text-text-secondary-light dark:text-text-secondary-dark mt-1 font-medium">Neural mapping generated successfully in pathway.</p>
              </div>
            </div>

            <div 
              className="absolute bottom-16 right-10 pointer-events-none z-20"
              style={{
                transform: `translate(${mousePos.x * 22}px, ${mousePos.y * 22}px)`,
                transition: 'transform 0.1s ease-out'
              }}
            >
              <div className="p-4 rounded-2xl glass-card border border-secondary/20 dark:border-secondary/10 shadow-lg w-48 animate-float-slow-delayed">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-secondary text-sm">bolt</span>
                  <span className="text-[10px] font-bold text-secondary font-display uppercase tracking-wider">Daily Resonance</span>
                </div>
                <div className="text-xl font-black font-display text-text-primary-light dark:text-text-primary-dark">98% Sync</div>
                <div className="w-full bg-border-light dark:bg-border-dark h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-secondary h-full w-[98%] rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Caption below the visualization */}
        <p className="text-[10px] font-bold text-text-secondary-light/40 dark:text-text-secondary-dark/35 uppercase tracking-widest font-mono text-center mt-6">
          ★ Hover to tilt visualizer in 3D space
        </p>
      </section>

      {/* 3. INTERACTIVE LEARNING JOURNEY */}
      <section id="features" className="py-24 px-6 max-w-[1280px] mx-auto z-10 relative scroll-mt-24">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-[700px] mx-auto mb-16 space-y-4"
        >
          <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-none">
            Your Structured Career Evolution
          </h2>
          <p className="text-base text-text-secondary-light dark:text-text-secondary-dark font-medium max-w-[500px] mx-auto">
            Traditional learning is broken and chaotic. Here is how ReLearn.ai guides you from aspiration to true domain mastery.
          </p>
        </motion.div>

        {/* Timeline Timeline Grid */}
        <motion.div 
          variants={STAGGER_CONTAINER_VARIANTS}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative"
        >
          {JOURNEY_STEPS.map((step) => (
            <motion.div
              key={step.step}
              variants={STAGGER_CARD_VARIANTS}
              className="p-8 rounded-[2rem] border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark/40 shadow-xl group hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300 relative overflow-hidden"
            >
              {/* Radial gradient glow on card hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent duration-300 transition-all pointer-events-none" />
              
              <div className="flex items-center justify-between mb-6 relative">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg`}>
                  <Icon name={step.icon} className="text-2xl" />
                </div>
                <span className="text-4xl font-black font-mono text-text-secondary-light/20 dark:text-text-secondary-dark/10 group-hover:text-primary/20 transition-colors">
                  {step.step}
                </span>
              </div>
              <h3 className="text-lg font-bold tracking-tight mb-2 group-hover:text-primary dark:group-hover:text-primary-dark transition-colors relative">{step.title}</h3>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark leading-relaxed font-medium relative">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 4. AI WORKSPACE EMULATOR */}
      <section id="workspace" className="py-24 px-6 bg-stone-50 dark:bg-stone-900/30 border-y border-border-light dark:border-border-dark relative z-10 scroll-mt-24">
        {/* Workspace Ambient Glow Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[10%] left-[-15%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,rgba(0,102,255,0.02)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,rgba(0,102,255,0.04)_50%,transparent_70%)] animate-glow-drift-purple" />
          <div className="absolute bottom-[10%] right-[-15%] w-[55%] h-[55%] rounded-full bg-[radial-gradient(circle_at_center,rgba(8,131,149,0.06)_0%,rgba(20,184,166,0.02)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(8,131,149,0.12)_0%,rgba(20,184,166,0.04)_50%,transparent_70%)] animate-glow-drift-blue" />
        </div>

        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Text Left */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary font-display">Personal growth OS</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-[1.1]">
              The Operating System for Learning
            </h2>
            <p className="text-base text-text-secondary-light dark:text-text-secondary-dark font-medium leading-relaxed">
              Consolidate your learning stack. ReLearn's workspace houses your structured study files, embeds adaptive recommendation panels, and features an integrated AI copilot that grows alongside your projects.
            </p>
            
            {/* Features checkmarks */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="check" className="text-sm font-bold" />
                </span>
                <p className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">Integrated AI Assistant with full context of your pathways</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="check" className="text-sm font-bold" />
                </span>
                <p className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">Interactive Study milestones with progress sync</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name="check" className="text-sm font-bold" />
                </span>
                <p className="text-sm font-semibold text-text-secondary-light dark:text-text-secondary-dark">Real-time resource recommendations tailored to your goals</p>
              </div>
            </div>
          </motion.div>

          {/* Interactive Workspace Panel Right */}
          <div className="lg:col-span-7 w-full rounded-3xl border border-border-light dark:border-border-dark bg-white dark:bg-background-dark overflow-hidden shadow-2xl flex flex-col min-h-[520px]">
            {/* Header Tabs */}
            <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark px-6 bg-stone-50 dark:bg-surface-dark/30">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setWorkspaceTab('notes')}
                  className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    workspaceTab === 'notes' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-text-secondary-light dark:text-text-secondary-dark'
                  }`}
                >
                  Notes Editor
                </button>
                <button 
                  onClick={() => setWorkspaceTab('ai')}
                  className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                    workspaceTab === 'ai' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-text-secondary-light dark:text-text-secondary-dark'
                  }`}
                >
                  AI Copilot
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </button>
                <button 
                  onClick={() => setWorkspaceTab('milestones')}
                  className={`py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    workspaceTab === 'milestones' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-text-secondary-light dark:text-text-secondary-dark'
                  }`}
                >
                  Milestones
                </button>
              </div>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-border-light dark:bg-border-dark" />
                <span className="w-2.5 h-2.5 rounded-full bg-border-light dark:bg-border-dark" />
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-6 relative min-h-[410px] flex flex-col justify-between">
              <AnimatePresence mode="wait">
                {workspaceTab === 'notes' && (
                  <motion.div 
                    key="notes"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-text-secondary-light/60 dark:text-text-secondary-dark/60">
                      <span>Pathways</span> &gt; <span>Advanced ML Systems</span> &gt; <span>Notes</span>
                    </div>
                    <h3 className="text-xl font-black font-display text-text-primary-light dark:text-text-primary-dark">Understanding Transformer Layers</h3>
                    <div className="font-mono text-sm text-text-secondary-light dark:text-text-secondary-dark space-y-2.5 max-w-[600px] leading-relaxed">
                      <p>• Multi-head attention mechanisms compute self-attention scores in parallel using Queries, Keys, and Values matrices.</p>
                      <p>• Query matrices represent the target search tokens, Keys represent contextual tokens, and Values specify semantic content weight.</p>
                      <p className="bg-primary/5 dark:bg-primary/10 border-l-2 border-primary p-3 rounded-r-lg italic text-text-primary-light dark:text-text-primary-dark">
                        Tip: Self-attention scales context quadratically. For huge inputs, use FlashAttention kernels to keep operations linear.
                      </p>
                    </div>
                  </motion.div>
                )}

                {workspaceTab === 'ai' && (
                  <motion.div 
                    key="ai"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex-1 flex flex-col justify-between h-full"
                  >
                    {/* Chat Area */}
                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[280px] pr-2 no-scrollbar">
                      {chatLog.map((chat, idx) => (
                        <div 
                          key={idx} 
                          className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {chat.sender === 'ai' && chat.text.startsWith("Flashcard generated!") ? (
                            (() => {
                              const match = chat.text.match(/Front:\s*'(.*?)'\s*•\s*Back:\s*'(.*?)'/);
                              if (match) {
                                return <InteractiveFlashcard front={match[1]} back={match[2]} />;
                              }
                              return (
                                <div className="p-4 rounded-2xl max-w-[85%] text-xs font-semibold leading-relaxed shadow-sm bg-stone-100 dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark">
                                  {chat.text}
                                </div>
                              );
                            })()
                          ) : (
                            <div className={`p-4 rounded-2xl max-w-[85%] text-xs font-semibold leading-relaxed shadow-sm ${
                              chat.sender === 'user' 
                                ? 'bg-primary text-white' 
                                : 'bg-stone-100 dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-primary-light dark:text-text-primary-dark'
                            }`}>
                              {chat.text}
                            </div>
                          )}
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="p-3 bg-stone-100 dark:bg-surface-dark rounded-xl flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pre-written quick questions to click */}
                    <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark flex flex-wrap gap-2">
                      <button 
                        onClick={() => simulateAIChat(
                          "Explain multi-head attention simply.", 
                          "Imagine a translator looking at a sentence. Multi-head attention allows them to focus on the action verb, the descriptive adjectives, and the subject noun all at the same time, combining their context mathematically."
                        )}
                        disabled={isTyping}
                        className="px-3 py-1.5 rounded-xl border border-border-light dark:border-border-dark text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors"
                      >
                        Explain simply
                      </button>
                      <button 
                        onClick={() => simulateAIChat(
                          "Create a flashcard from my notes.", 
                          "Flashcard generated! Front: 'What is the formula for scaled dot-product attention?' • Back: 'Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V'"
                        )}
                        disabled={isTyping}
                        className="px-3 py-1.5 rounded-xl border border-border-light dark:border-border-dark text-[10px] font-bold hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors"
                      >
                        Generate Flashcard
                      </button>
                    </div>
                  </motion.div>
                )}

                {workspaceTab === 'milestones' && (
                  <motion.div 
                    key="milestones"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-text-secondary-light/60 dark:text-text-secondary-dark/60">Module Milestones</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border-light dark:border-border-dark bg-stone-50/50 dark:bg-surface-dark/20">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                          <div>
                            <p className="text-xs font-bold">1. Scaled Dot-Product Mathematics</p>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-medium">Completed May 26</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-extrabold rounded">100 XP</span>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl border border-border-light dark:border-border-dark bg-stone-50/50 dark:bg-surface-dark/20">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-primary animate-pulse">radio_button_checked</span>
                          <div>
                            <p className="text-xs font-bold">2. Implementing Multi-Head Attention Class</p>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-medium">Current Goal</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-extrabold rounded">250 XP</span>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl border border-border-light dark:border-border-dark bg-stone-50/50 dark:bg-surface-dark/20 opacity-60">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined">radio_button_unchecked</span>
                          <div>
                            <p className="text-xs font-bold">3. Building a Decoder-Only Model Architecture</p>
                            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark font-medium">Locked</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-stone-500/10 text-stone-500 text-[9px] font-extrabold rounded">500 XP</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 5. KNOWLEDGE MATRIX SECTION */}
      <section id="matrix" className="py-24 px-6 max-w-[1280px] mx-auto z-10 relative scroll-mt-24">
        {/* Matrix Ambient Glow Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[5%] right-[-15%] w-[55%] h-[55%] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,102,255,0.06)_0%,rgba(99,102,241,0.02)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(0,102,255,0.12)_0%,rgba(99,102,241,0.04)_50%,transparent_70%)] animate-glow-drift-blue" />
          <div className="absolute bottom-[5%] left-[-15%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05)_0%,rgba(236,72,153,0.01)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,rgba(236,72,153,0.03)_50%,transparent_70%)] animate-glow-drift-purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Text Left */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary font-display">Knowledge Matrix</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-[1.1]">
              Evolve Your Personal Skill Graph
            </h2>
            <p className="text-base text-text-secondary-light dark:text-text-secondary-dark font-medium leading-relaxed">
              No more flat tables of scores. ReLearn maps your knowledge as a multidimensional spatial network, tracking your resonance level and cognitive depth. Evolve nodes from greenhorns to world-class masteries.
            </p>

            {/* Live stats highlight */}
            {selectedNode && (
              <motion.div 
                key={selectedNode.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-[2rem] border border-border-light dark:border-border-dark bg-white dark:bg-background-dark/80 shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark">Inspecting Node</span>
                  <span className={`px-2 py-0.5 bg-gradient-to-r ${selectedNode.color} text-white text-[9px] font-bold rounded`}>
                    {selectedNode.level}
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-black tracking-tight">{selectedNode.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-semibold">Resonance:</span>
                    <span className="text-xs font-bold text-primary">{selectedNode.resonance}%</span>
                  </div>
                  <div className="w-full bg-border-light dark:bg-border-dark h-2 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${selectedNode.color} rounded-full`} style={{ width: `${selectedNode.resonance}%` }} />
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Interactive Matrix Map Right */}
          <div className="lg:col-span-7 aspect-[4/3] rounded-3xl border border-border-light dark:border-border-dark bg-white dark:bg-background-dark relative overflow-hidden shadow-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-text-secondary-light/60 dark:text-text-secondary-dark/60 font-mono">Cognitive Resonance Grid</span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3 flex-shrink-0">
                  <span className="status-dot-outer" />
                  <span className="status-dot-inner w-3 h-3" />
                </span>
                <span className="text-[10px] font-bold text-emerald-500 font-mono uppercase tracking-wider">Live tracking</span>
              </div>
            </div>

            {/* Interactive Grid Canvas */}
            <div className="flex-1 relative border border-dashed border-border-light dark:border-border-dark rounded-2xl bg-stone-50/50 dark:bg-surface-dark/10 my-4 overflow-hidden">
              {/* Connecting lines in SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="25%" y1="35%" x2="60%" y2="25%" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="25%" y1="35%" x2="45%" y2="70%" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="60%" y1="25%" x2="45%" y2="70%" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="60%" y1="25%" x2="80%" y2="65%" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="45%" y1="70%" x2="80%" y2="65%" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="45%" y1="70%" x2="15%" y2="80%" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="2" strokeDasharray="3 3" />

                {/* Pulsing Concentric Halos behind the selected node */}
                {selectedNode && (
                  <>
                    <circle 
                      cx={`${selectedNode.x}%`} 
                      cy={`${selectedNode.y}%`} 
                      r="45" 
                      fill="none" 
                      stroke="url(#selected-node-glow)" 
                      strokeWidth="2" 
                      className="origin-center animate-halo-ripple pointer-events-none" 
                      style={{ transformBox: 'fill-box', transformOrigin: 'center' }} 
                    />
                    <circle 
                      cx={`${selectedNode.x}%`} 
                      cy={`${selectedNode.y}%`} 
                      r="45" 
                      fill="none" 
                      stroke="url(#selected-node-glow)" 
                      strokeWidth="1.5" 
                      className="origin-center animate-halo-ripple-delayed pointer-events-none" 
                      style={{ transformBox: 'fill-box', transformOrigin: 'center' }} 
                    />
                  </>
                )}

                <defs>
                  <radialGradient id="selected-node-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0066FF" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#088395" stopOpacity="0" />
                  </radialGradient>
                </defs>
              </svg>

              {/* Nodes */}
              {MATRIX_NODES.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`absolute p-2.5 sm:p-4 rounded-2xl border bg-white dark:bg-surface-dark shadow-md flex flex-col gap-1 text-left group hover:scale-105 active:scale-95 transition-all duration-300 ${
                    selectedNode?.id === node.id 
                      ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20' 
                      : 'border-border-light dark:border-border-dark hover:border-text-secondary-light/40'
                  }`}
                  style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <span className="text-[10px] font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight">{node.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[9px] font-extrabold text-text-secondary-light dark:text-text-secondary-dark">{node.resonance}% Sync</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="text-[10px] font-bold text-text-secondary-light/60 dark:text-text-secondary-dark/60 font-mono text-center">
              Click any floating node on the canvas to inspect its cognitive details.
            </div>
          </div>
        </div>
      </section>

      {/* 6. CONCEPT COLLISION */}
      <section id="collision" className="py-24 px-6 bg-stone-50 dark:bg-stone-900/30 border-y border-border-light dark:border-border-dark relative z-10 scroll-mt-24">
        {/* Collision Ambient Glow Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[20%] left-[10%] w-[65%] h-[65%] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0%,rgba(168,85,247,0.02)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,rgba(168,85,247,0.04)_50%,transparent_70%)] animate-glow-drift-purple" />
          <div className="absolute bottom-[5%] right-[-15%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.06)_0%,rgba(8,131,149,0.02)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.12)_0%,rgba(8,131,149,0.04)_50%,transparent_70%)] animate-glow-drift-emerald" />
        </div>

        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Interactive Collide Simulator Left */}
          <div className="lg:col-span-7 p-8 rounded-[2.5rem] border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark/40 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[460px]">
            {/* Visual Node Collision animation background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03),transparent_60%)] pointer-events-none" />

            {/* Sci-Fi Reactor Collision Overlay */}
            {colliding && (
              <div className="absolute inset-0 bg-background-light/80 dark:bg-background-dark/85 backdrop-blur-md z-30 flex flex-col items-center justify-center overflow-hidden">
                {/* Shockwave grid background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-70 pointer-events-none" />
                
                {/* Central Shockwave ring */}
                <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full border-2 border-indigo-500/50 bg-indigo-500/5 animate-reactor-shockwave z-10" />
                <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full border border-secondary/40 bg-secondary/5 animate-reactor-shockwave [animation-delay:0.1s] z-10" />

                {/* Central reactor core flash overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-white to-secondary/30 animate-reactor-flash pointer-events-none z-20" />

                {/* Converging energy bubbles */}
                <div className="absolute top-1/2 left-1/2 w-28 h-28 rounded-full bg-gradient-to-br from-primary to-indigo-600 blur-xl animate-collide-left" />
                <div className="absolute top-1/2 left-1/2 w-28 h-28 rounded-full bg-gradient-to-bl from-secondary to-teal-500 blur-xl animate-collide-right" />

                {/* Floating quantum spark particles */}
                <div className="absolute inset-0 pointer-events-none z-15">
                  {[...Array(12)].map((_, i) => {
                    const sway = (i % 3 - 1) * 30 + Math.random() * 20;
                    const delay = (i * 0.1).toFixed(2);
                    const left = 35 + (i * 5) + Math.random() * 5;
                    return (
                      <span 
                        key={i} 
                        className="absolute bottom-1/4 w-1.5 h-1.5 rounded-full bg-indigo-400 blur-[1px] animate-reactor-particle"
                        style={{
                          left: `${left}%`,
                          '--sway': `${sway}px`,
                          animationDelay: `${delay}s`
                        } as React.CSSProperties}
                      />
                    );
                  })}
                </div>

                {/* Status HUD readout */}
                <div className="relative text-center space-y-3 z-30">
                  <div className="w-16 h-16 rounded-full border-4 border-t-primary border-r-secondary border-b-indigo-500 border-l-stone-200 animate-spin mx-auto flex items-center justify-center bg-stone-50 dark:bg-surface-dark shadow-xl">
                    <Icon name="bolt" className="text-2xl text-primary animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black font-display uppercase tracking-widest bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">SYNTHESIZING MATRIX PATHWAYS</h4>
                    <p className="text-[9px] font-bold text-text-secondary-light/60 dark:text-text-secondary-dark/60 font-mono mt-1 uppercase tracking-widest animate-pulse">
                      Analyzing {collisionA} x {collisionB}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-4 mb-6">
                <span className="text-sm font-extrabold font-display uppercase tracking-wider text-primary">Collision Generator</span>
                <span className="text-xs font-bold text-text-secondary-light dark:text-text-secondary-dark font-mono">Status: Ready</span>
              </div>

              {/* Input Selectors */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark">Select Base Domain</label>
                  <select 
                    value={collisionA}
                    onChange={(e) => setCollisionA(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-primary-light dark:text-text-primary-dark"
                  >
                    {COLLISION_DOMAINS_A.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-text-secondary-light dark:text-text-secondary-dark">Select Target Domain</label>
                  <select 
                    value={collisionB}
                    onChange={(e) => setCollisionB(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-background-dark border border-border-light dark:border-border-dark rounded-2xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-primary-light dark:text-text-primary-dark"
                  >
                    {COLLISION_DOMAINS_B.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Trigger Button */}
              <button 
                onClick={triggerCollision}
                disabled={colliding}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-black text-sm tracking-wider uppercase hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] glow-primary"
              >
                {colliding ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    <span>Synthesizing Nodes...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    <span>Collide Concepts!</span>
                  </>
                )}
              </button>
            </div>

            {/* Results Display */}
            <div className="mt-8 border-t border-border-light dark:border-border-dark pt-6 flex-1 flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {collisionResult ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-black tracking-tight text-primary dark:text-text-primary-dark">{collisionResult.title}</h4>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold rounded">Resonance: {collisionResult.resonance}%</span>
                    </div>
                    <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark leading-relaxed font-semibold">{collisionResult.desc}</p>
                    <div className="p-3 bg-stone-50 dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-base">forward</span>
                      <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Next Step: {collisionResult.nextSteps}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    className="text-center py-6 text-text-secondary-light/60 dark:text-text-secondary-dark/60 font-semibold text-xs italic"
                  >
                    Select two domains above and trigger a collision to generate an AI interdisciplinary report.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Text Right */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 font-display">Concept Collision</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-[1.1]">
              Cross-Pollinate Separate Domains
            </h2>
            <p className="text-base text-text-secondary-light dark:text-text-secondary-dark font-medium leading-relaxed">
              True innovation happens at the intersection of disciplines. Our custom Concept Collision engine analyzes your different goals and synthesizes unique learning paths that merge them logically, helping you build a one-of-a-kind career footprint.
            </p>
            <div className="p-5 rounded-2xl border border-border-light dark:border-border-dark bg-stone-50 dark:bg-surface-dark/20 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-text-secondary-light/35 dark:text-text-secondary-dark/20">
                <Icon name="tips_and_updates" className="text-4xl" />
              </div>
              <h4 className="text-sm font-bold tracking-tight mb-1">Synthesizing Skills</h4>
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark leading-relaxed font-semibold">Combine Finance + Game Development to model economic game theories or write smart-contracts for MMO economies.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 7. MOBILE EXPERIENCE SECTION */}
      <section id="mobile" className="py-24 px-6 max-w-[1280px] mx-auto z-10 relative scroll-mt-24">
        {/* Mobile Ambient Glow Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[10%] left-[-15%] w-[55%] h-[55%] rounded-full bg-[radial-gradient(circle_at_center,rgba(8,131,149,0.06)_0%,rgba(20,184,166,0.02)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(8,131,149,0.12)_0%,rgba(20,184,166,0.04)_50%,transparent_70%)] animate-glow-drift-blue" />
          <div className="absolute bottom-[10%] right-[-15%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.06)_0%,rgba(0,102,255,0.02)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.12)_0%,rgba(0,102,255,0.04)_50%,transparent_70%)] animate-glow-drift-rose" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Mobile Previews Left */}
          <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 relative py-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,131,149,0.03),transparent_70%)] pointer-events-none" />

            {/* Mobile Mockup 1 */}
            <div className="w-60 h-[460px] rounded-[3rem] border-[10px] border-stone-900 dark:border-stone-950 ring-4 ring-stone-200 dark:ring-stone-800 bg-background-light dark:bg-background-dark shadow-2xl relative overflow-hidden shrink-0 transform -rotate-3 hover:rotate-0 transition-all duration-500 animate-float-mobile-1">
              {/* Dynamic Island */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-30 flex items-center justify-end px-2 gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-950 border border-white/10" />
                <span className="w-1 h-1 rounded-full bg-emerald-500/80" />
              </div>
              {/* Home Indicator */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-black/30 dark:bg-white/30 rounded-full z-30" />
              {/* Inner Mock content */}
              <div className="p-4 pt-8 pb-5 space-y-4 h-full flex flex-col justify-between overflow-y-auto no-scrollbar">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-primary uppercase font-display">Pathways</span>
                    <Icon name="notifications" className="text-sm text-text-secondary-light" />
                  </div>
                  <h4 className="text-sm font-black font-display mt-2 leading-none">Your Growth Roadmaps</h4>
                  
                  <div className="mt-4 p-3 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark space-y-2">
                    <p className="text-[10px] font-bold">NLP & LLM Architectures</p>
                    <div className="w-full bg-border-light dark:bg-border-dark h-1 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[45%]" />
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-semibold text-text-secondary-light">
                      <span>45% Complete</span>
                      <span>12 Lessons left</span>
                    </div>
                  </div>

                  <div className="mt-2.5 p-3 rounded-xl bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark space-y-2">
                    <p className="text-[10px] font-bold">Behavioral Microeconomics</p>
                    <div className="w-full bg-border-light dark:bg-border-dark h-1 rounded-full overflow-hidden">
                      <div className="bg-secondary h-full w-[80%]" />
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-semibold text-text-secondary-light">
                      <span>80% Complete</span>
                      <span>3 Lessons left</span>
                    </div>
                  </div>
                </div>

                <div className="h-10 w-full flex items-center justify-around border-t border-border-light dark:border-border-dark bg-stone-50 dark:bg-surface-dark/40 absolute bottom-0 left-0 px-2">
                  <Icon name="home" className="text-primary text-base" />
                  <Icon name="bar_chart" className="text-text-secondary-light text-base" />
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white"><Icon name="add" className="text-xs" /></div>
                  <Icon name="menu_book" className="text-text-secondary-light text-base" />
                  <Icon name="settings" className="text-text-secondary-light text-base" />
                </div>
              </div>
            </div>

            {/* Mobile Mockup 2 */}
            <div className="w-60 h-[460px] rounded-[3rem] border-[10px] border-stone-900 dark:border-stone-950 ring-4 ring-stone-200 dark:ring-stone-800 bg-background-light dark:bg-background-dark shadow-2xl relative overflow-hidden shrink-0 transform rotate-3 hover:rotate-0 transition-all duration-500 animate-float-mobile-2">
              {/* Dynamic Island */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-30 flex items-center justify-end px-2 gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-950 border border-white/10" />
                <span className="w-1 h-1 rounded-full bg-emerald-500/80" />
              </div>
              {/* Home Indicator */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-black/30 dark:bg-white/30 rounded-full z-30" />
              {/* Inner Mock content */}
              <div className="p-4 pt-8 pb-5 space-y-4 h-full flex flex-col justify-between overflow-y-auto no-scrollbar">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-secondary uppercase font-display">AI Assistant</span>
                    <span className="relative flex h-3 w-3 flex-shrink-0">
                      <span className="status-dot-outer" />
                      <span className="status-dot-inner w-3 h-3" />
                    </span>
                  </div>
                  
                  <div className="mt-4 p-3 rounded-xl bg-stone-100 dark:bg-surface-dark text-[9px] font-semibold leading-relaxed">
                    Analyzing page concepts... Suggested project: "Build a vector database connecting classical literature themes."
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-primary text-white text-[9px] font-semibold leading-relaxed self-end">
                    Suggest reading files.
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-stone-100 dark:bg-surface-dark text-[9px] font-semibold leading-relaxed">
                    I recommend reviewing 'Transformers in Action' Chapter 4, and 'Attention Maps' inside your notes.
                  </div>
                </div>

                <div className="h-10 w-full flex items-center justify-around border-t border-border-light dark:border-border-dark bg-stone-50 dark:bg-surface-dark/40 absolute bottom-0 left-0 px-2">
                  <Icon name="home" className="text-text-secondary-light text-base" />
                  <Icon name="bar_chart" className="text-text-secondary-light text-base" />
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white"><Icon name="add" className="text-xs" /></div>
                  <Icon name="menu_book" className="text-text-secondary-light text-base" />
                  <Icon name="settings" className="text-text-secondary-light text-base" />
                </div>
              </div>
            </div>
          </div>

          {/* Text Right */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary font-display">Optimized Performance</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-[1.1]">
              Evolve Your Career on the Go
            </h2>
            <p className="text-base text-text-secondary-light dark:text-text-secondary-dark font-medium leading-relaxed">
              Our mobile experience offers a fully responsive version of your learning plans, active workspace note-taking, progress tracking, and AI chatbot consultations. Highly optimized animations maintain 60FPS even on standard Android devices.
            </p>
            <div className="flex gap-4">
              <div className="flex-1 p-4 rounded-xl border border-border-light dark:border-border-dark text-center">
                <span className="text-lg font-black font-display block text-primary">60 FPS</span>
                <span className="text-[9px] text-text-secondary-light font-bold">Liquid Smooth Motion</span>
              </div>
              <div className="flex-1 p-4 rounded-xl border border-border-light dark:border-border-dark text-center">
                <span className="text-lg font-black font-display block text-secondary">Zero Lag</span>
                <span className="text-[9px] text-text-secondary-light font-bold">Responsive Touch Gestures</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 8. ABOUT SECTION */}
      <section id="about" className="py-24 px-6 bg-stone-50 dark:bg-stone-900/30 border-y border-border-light dark:border-border-dark relative z-10 scroll-mt-24">
        {/* About Ambient Glow Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[5%] right-[-15%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,102,255,0.06)_0%,rgba(99,102,241,0.02)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(0,102,255,0.12)_0%,rgba(99,102,241,0.04)_50%,transparent_70%)] animate-glow-drift-purple" />
          <div className="absolute bottom-[5%] left-[-15%] w-[55%] h-[55%] rounded-full bg-[radial-gradient(circle_at_center,rgba(8,131,149,0.06)_0%,rgba(20,184,166,0.02)_50%,transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(8,131,149,0.12)_0%,rgba(20,184,166,0.04)_50%,transparent_70%)] animate-glow-drift-emerald" />
        </div>

        <div className="max-w-[1280px] mx-auto space-y-12 relative z-10">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-[700px] mx-auto space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary font-display">About ReLearn.ai</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-none">
              Behind the Platform
            </h2>
            <p className="text-sm sm:text-base text-text-secondary-light dark:text-text-secondary-dark font-semibold">
              Redefining how modern learning and career growth should feel.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Card: Core Philosophy */}
            <div className="lg:col-span-7 rounded-3xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark/40 backdrop-blur-xl p-8 sm:p-10 flex flex-col justify-between shadow-xl">
              <div className="space-y-6 text-left">
                <h3 className="text-lg sm:text-xl font-black font-display tracking-tight text-primary">
                  Our Philosophy & Vision
                </h3>
                <div className="space-y-6 text-sm sm:text-base text-text-secondary-light dark:text-text-secondary-dark font-medium leading-relaxed">
                  <p>
                    At <span className="font-bold text-text-primary-light dark:text-text-primary-dark">ReLearn.ai</span>, we believe learning should feel meaningful, immersive, and guided — not confusing, scattered, or overwhelming.
                  </p>
                  <p>
                    We are building a space where people can grow with clarity, stay consistent with purpose, and transform knowledge into real progress. Through adaptive learning systems, interactive workspaces, and personalized pathways, ReLearn.ai is designed to make growth feel structured, engaging, and future-focused.
                  </p>
                  <p>
                    Behind ReLearn is a passionate team driven by curiosity, creativity, and the vision of redefining how modern learning should feel. Every experience, interaction, and feature is carefully crafted to help learners build confidence, discover direction, and evolve continuously in a fast-changing world.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Card: Journey & Channels */}
            <div className="lg:col-span-5 rounded-3xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark/40 backdrop-blur-xl p-8 sm:p-10 flex flex-col justify-between shadow-xl relative overflow-hidden text-left">
              {/* Soft visual background glow */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-6">
                <h3 className="text-lg sm:text-xl font-black font-display tracking-tight text-secondary">
                  The Journey
                </h3>
                <div className="space-y-4">
                  <p className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark leading-relaxed">
                    This is more than a platform. It is a step toward a smarter, more intentional way of learning and building the future.
                  </p>
                  <div className="inline-block px-3 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20 text-[10px] font-black uppercase tracking-wider text-secondary font-mono">
                    Join with us & travel through the journey
                  </div>
                </div>
              </div>

              {/* Direct channels */}
              <div className="mt-8 space-y-4 border-t border-border-light dark:border-border-dark pt-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-text-secondary-light/60 dark:text-text-secondary-dark/60 font-mono mb-3">
                    Direct Channels & Support
                  </h4>
                  <div className="space-y-2.5">
                    <a 
                      href="mailto:imposterz.rev02@gmail.com"
                      className="flex items-center gap-3 p-3 rounded-xl border border-border-light dark:border-border-dark bg-stone-50/50 dark:bg-surface-dark/20 hover:border-primary/40 hover:bg-white dark:hover:bg-background-dark transition-all min-w-0"
                    >
                      <Icon name="mail" className="text-primary text-base flex-shrink-0" />
                      <span className="text-xs font-bold truncate text-text-primary-light dark:text-text-primary-dark font-mono">imposterz.rev02@gmail.com</span>
                    </a>
                    
                    <a 
                      href="mailto:imposterz.rith08@gmail.com"
                      className="flex items-center gap-3 p-3 rounded-xl border border-border-light dark:border-border-dark bg-stone-50/50 dark:bg-surface-dark/20 hover:border-secondary/40 hover:bg-white dark:hover:bg-background-dark transition-all min-w-0"
                    >
                      <Icon name="mail" className="text-secondary text-base flex-shrink-0" />
                      <span className="text-xs font-bold truncate text-text-primary-light dark:text-text-primary-dark font-mono">imposterz.rith08@gmail.com</span>
                    </a>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-bold text-text-secondary-light/60 dark:text-text-secondary-dark/60 italic">— Team ReLearn</span>
                  <span className="relative flex h-3 w-3 flex-shrink-0">
                    <span className="status-dot-outer" />
                    <span className="status-dot-inner w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FINAL CTA SECTION */}
      <section className="py-32 px-6 max-w-[1280px] mx-auto z-10 relative">
        {/* Glow behind final box */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative rounded-[3rem] border border-primary/20 dark:border-primary/10 bg-white/40 dark:bg-surface-dark/40 backdrop-blur-2xl px-6 py-20 text-center space-y-8 overflow-hidden shadow-2xl max-w-[960px] mx-auto">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] opacity-40 pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight leading-none max-w-[700px] mx-auto">
            Stop Consuming Random Content.
          </h2>
          <h3 className="text-2xl sm:text-4xl font-extrabold font-display text-secondary tracking-tight">
            Start Building a Structured Future.
          </h3>
          <p className="text-sm sm:text-base text-text-secondary-light dark:text-text-secondary-dark max-w-[500px] mx-auto font-semibold">
            Join thousands of active scholars mapping out interdisciplinary careers. Enter the cognitive platform built for personal evolution.
          </p>

          <button 
            onClick={() => navigate(user ? '/dashboard' : '/signup')}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-xl shadow-primary/25 hover:shadow-primary/45 transition-all hover:scale-105 active:scale-[0.98] glow-primary inline-flex items-center gap-2"
          >
            <span>{user ? 'Enter ReLearn.ai' : 'Get Started for Free'}</span>
            <Icon name="arrow_forward" className="text-base" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-border-light dark:border-border-dark bg-stone-50 dark:bg-background-dark relative z-10 text-center text-text-secondary-light/60 dark:text-text-secondary-dark/60 text-xs font-semibold">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center text-white"><Icon name="school" className="text-sm" /></div>
            <span className="font-bold text-text-primary-light dark:text-text-primary-dark">ReLearn.ai</span>
          </div>
          <div>
            © {new Date().getFullYear()} ReLearn.ai. All rights reserved. Built for structured human growth.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
