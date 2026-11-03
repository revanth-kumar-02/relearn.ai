import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SEO from '../common/SEO';
import ThemeToggle from '../common/ThemeToggle';
import { STRUCTURED_DATA_WEBSITE, STRUCTURED_DATA_ORGANIZATION } from '../../config/seo';
import '../../styles/magicpath-landing.css';

// SVG Icon paths extracted directly from approved MagicPath component
const ICON_PATHS: Record<string, React.ReactNode> = {
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M4 5.5v16M8 7h8M8 10h7" />
    </>
  ),
  arrow: (
    <>
      <path d="M4.5 12h14" />
      <path d="m13 6.5 5.5 5.5-5.5 5.5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  route: (
    <>
      <circle cx="6" cy="18" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <path d="M8.5 18h2a4 4 0 0 0 4-4v-4a4 4 0 0 1 4-4" />
    </>
  ),
  note: (
    <>
      <path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2z" />
      <path d="M14.5 3.5V8H19M8 12h8M8 15.5h8" />
    </>
  ),
  cards: (
    <>
      <rect x="4" y="5" width="13" height="15" rx="2" />
      <path d="M8 3h10a2 2 0 0 1 2 2v12M8 10h5M8 13h5" />
    </>
  ),
  quiz: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.6 2.6 0 1 1 4.7 1.5c-1 1.2-2.2 1.4-2.2 3" />
      <path d="M12 17.2h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  spark: (
    <>
      <path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
      <path d="m19 15 1 2.5 2.5 1-2.5 1L19 22l-1-2.5-2.5-1 2.5-1z" />
    </>
  ),
  chart: <path d="M4 20V11M10 20V4M16 20v-7M22 20H2" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  )
};

interface IconProps {
  name: keyof typeof ICON_PATHS;
  size?: number;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, size = 20, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {ICON_PATHS[name]}
  </svg>
);

const BrandLogo: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <a
    className="rl-brand"
    href="#top"
    aria-label="Relearn.ai homepage"
    onClick={(e) => {
      e.preventDefault();
      onClick?.();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }}
  >
    <span className="rl-brand-mark">
      <Icon name="book" size={22} />
    </span>
    <span>
      Relearn<span className="rl-brand-dot">.</span>ai
    </span>
  </a>
);

// Illustrative Learning Plan Preview (FIG. 01)
const PlanPreview: React.FC = () => (
  <div className="rl-plan-preview" aria-label="Illustrative learning plan preview">
    <div className="rl-preview-chrome">
      <div className="rl-window-dots">
        <i />
        <i />
        <i />
      </div>
      <span className="rl-mono">MY LEARNING PLAN</span>
      <span className="rl-preview-chip">
        <span /> EXAMPLE
      </span>
    </div>
    <div className="rl-preview-inner">
      <aside className="rl-preview-rail">
        <div className="rl-rail-heading">
          <span className="rl-rail-mark">
            <Icon name="route" size={17} />
          </span>
          <div>
            <strong>Learning path</strong>
            <small>Full-stack foundations</small>
          </div>
        </div>
        <span className="rl-rail-label">YOUR PLAN</span>
        <div className="rl-rail-item active">
          <span className="rl-rail-bullet" /> Foundations
        </div>
        <div className="rl-rail-item">
          <span className="rl-rail-bullet" /> Core concepts
        </div>
        <div className="rl-rail-item">
          <span className="rl-rail-bullet" /> Build a project
        </div>
        <div className="rl-rail-item">
          <span className="rl-rail-bullet" /> Review &amp; revisit
        </div>
        <div className="rl-rail-foot">
          <Icon name="clock" size={14} />
          <span>One step at a time.</span>
        </div>
      </aside>
      <div className="rl-preview-main">
        <div className="rl-preview-title">
          <span className="rl-overline">WEEK 01 · START HERE</span>
          <h3>Build your foundations</h3>
          <p>A practical sequence to help you move from concepts to code.</p>
        </div>
        <div className="rl-path-progress">
          <div>
            <span>Learning path</span>
            <strong>Step 2 of 8</strong>
          </div>
          <div className="rl-progress-track">
            <span />
          </div>
        </div>
        <div className="rl-preview-lessons">
          <div className="rl-preview-lesson complete">
            <span className="rl-lesson-symbol">
              <Icon name="check" size={14} />
            </span>
            <div>
              <strong>How the web works</strong>
              <small>Concept notes · 8 min</small>
            </div>
            <span className="rl-lesson-state">REVIEW</span>
          </div>
          <div className="rl-preview-lesson selected">
            <span className="rl-lesson-symbol">02</span>
            <div>
              <strong>HTML &amp; semantic structure</strong>
              <small>Lesson · examples · practice</small>
            </div>
            <span className="rl-lesson-arrow">
              <Icon name="arrow" size={15} />
            </span>
          </div>
          <div className="rl-preview-lesson">
            <span className="rl-lesson-symbol">03</span>
            <div>
              <strong>Build a simple page</strong>
              <small>Mini project · apply what you learned</small>
            </div>
            <span className="rl-lesson-state">NEXT</span>
          </div>
        </div>
        <div className="rl-preview-note">
          <span className="rl-note-icon">
            <Icon name="spark" size={15} />
          </span>
          <p>
            <strong>A clear next step makes starting easier.</strong>
            <br />
            Keep the focus on learning, not managing the plan.
          </p>
        </div>
      </div>
    </div>
    <div className="rl-preview-bottom">
      <span>
        <Icon name="book" size={13} /> Illustrative interface preview
      </span>
      <span>PLAN / STUDY / PRACTICE</span>
    </div>
  </div>
);

// Interactive Active Recall Study Moment (FIG. 02)
const RecallPreview: React.FC = () => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rl-recall-card">
      <div className="rl-recall-top">
        <span className="rl-recall-kicker">
          <span className="rl-live-dot" /> ACTIVE RECALL
        </span>
        <span className="rl-mono">QUESTION 02</span>
      </div>
      <div className="rl-recall-content">
        <p className="rl-recall-overline">PAUSE BEFORE YOU REVEAL</p>
        <h3>What is the purpose of semantic HTML?</h3>
        <p className="rl-recall-help">
          Try to explain it in your own words. Then compare your explanation with the key idea.
        </p>
        {revealed ? (
          <div className="rl-recall-answer">
            <span>
              <Icon name="check" size={15} />
            </span>
            <div>
              <strong>Meaning, structure, and access.</strong>
              <p>
                Semantic elements describe the role of content. They help browsers, assistive technologies, and developers understand a page&apos;s structure.
              </p>
            </div>
          </div>
        ) : (
          <div className="rl-recall-lines">
            <span />
            <span />
            <span />
          </div>
        )}
        <button
          type="button"
          className="rl-button rl-reveal-button"
          onClick={() => setRevealed((prev) => !prev)}
        >
          {revealed ? 'Hide explanation' : 'Reveal explanation'}{' '}
          <Icon name="arrow" size={16} />
        </button>
      </div>
      <div className="rl-recall-footer">
        <span>
          <Icon name="target" size={14} /> Practice at your pace
        </span>
        <span>{revealed ? 'Answer revealed' : 'Recall before review'}</span>
      </div>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const scrollToSection = (id: string) => {
    closeMenu();
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogin = () => {
    closeMenu();
    navigate(user ? '/dashboard' : '/login');
  };

  const handleGetStarted = () => {
    closeMenu();
    navigate(user ? '/dashboard' : '/signup');
  };

  const handleBuildPlan = () => {
    closeMenu();
    navigate(user ? '/create-plan' : '/signup');
  };

  return (
    <div className="rl-page" id="top">
      <SEO
        title="Relearn.ai — AI-Powered Personalized Learning Platform"
        exactTitle
        description="Relearn.ai is an AI-powered personalized learning platform that helps students create personalized learning plans, study interactively, practice with quizzes and flashcards, and track their learning progress."
        canonical="https://relearn-ai.netlify.app/"
        ogType="website"
        ogImage="https://relearn-ai.netlify.app/logo.png"
        jsonLd={[STRUCTURED_DATA_WEBSITE, STRUCTURED_DATA_ORGANIZATION]}
      />

      {/* Header */}
      <header className="rl-header">
        <div className="rl-header-inner">
          <BrandLogo onClick={() => scrollToSection('top')} />
          <button
            type="button"
            className="rl-menu-toggle"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
          </button>
          <nav className={`rl-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('features');
              }}
            >
              Features
            </a>
            <a
              href="#workspace"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('workspace');
              }}
            >
              Workspace
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('how-it-works');
              }}
            >
              How it works
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('about');
              }}
            >
              About
            </a>
            {/* Mobile Navigation Appearance / Theme Toggle */}
            <div className="pt-3 pb-2 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2 sm:hidden">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider font-mono">
                Appearance
              </span>
              <ThemeToggle variant="segmented" showLabels className="w-full" />
            </div>

            <div className="rl-nav-actions">
              <ThemeToggle variant="icon" className="hidden sm:flex" />
              <button type="button" className="rl-login" onClick={handleLogin}>
                Log in
              </button>
              <button
                type="button"
                className="rl-button rl-button-small"
                onClick={handleGetStarted}
              >
                Get started <Icon name="arrow" size={15} />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="rl-hero">
          <div className="rl-hero-inner">
            <div className="rl-hero-copy">
              <div className="rl-eyebrow">
                <span className="rl-eyebrow-rule" /> A CLEARER WAY TO LEARN
              </div>
              <h1>
                Turn what you want to learn into{' '}
                <em>a plan you can follow.</em>
              </h1>
              <p className="rl-hero-lede">
                Relearn.ai brings learning plans, interactive study, practice, and progress together in one place — so you can focus on understanding what matters.
              </p>
              <div className="rl-hero-actions">
                <button type="button" className="rl-button" onClick={handleBuildPlan}>
                  Build my learning plan <Icon name="arrow" size={17} />
                </button>
                <a
                  className="rl-secondary-link"
                  href="#workspace"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('workspace');
                  }}
                >
                  Explore the workspace <Icon name="arrow" size={15} />
                </a>
              </div>
              <div className="rl-hero-note">
                <span className="rl-note-rule" />
                <span>Less collecting tabs. More connecting ideas.</span>
              </div>
            </div>
            <div className="rl-hero-visual">
              <div className="rl-visual-index">
                <span>AN EXAMPLE LEARNING PATH</span>
                <span>01 — 04</span>
              </div>
              <PlanPreview />
              <div className="rl-visual-caption">
                <span className="rl-caption-blue">FIG. 01</span>
                <span>A learning goal, broken into practical next steps.</span>
              </div>
            </div>
          </div>
          <div className="rl-hero-baseline">
            <span>LEARNING PLANS</span>
            <i />
            <span>STUDY</span>
            <i />
            <span>PRACTICE</span>
            <i />
            <span>PROGRESS</span>
          </div>
        </section>

        {/* Manifesto / About Section */}
        <section className="rl-manifesto" id="about">
          <div className="rl-section-index">
            <span>01</span>
            <span>WHY RELEARN.AI</span>
          </div>
          <div className="rl-manifesto-grid">
            <h2>
              Less collecting tabs.
              <br />
              <em>More connecting ideas.</em>
            </h2>
            <div className="rl-manifesto-copy">
              <p>
                Learning can turn into a pile of saved links, unfinished tutorials, and notes you never revisit. Relearn.ai is built to help bring that effort into a path you can return to.
              </p>
              <a
                href="#how-it-works"
                className="rl-inline-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('how-it-works');
                }}
              >
                See how it comes together <Icon name="arrow" size={16} />
              </a>
            </div>
          </div>
          <div className="rl-manifesto-bottom">
            <span>THE AIM ISN&apos;T TO DO MORE.</span>
            <strong>It&apos;s to understand more of what you do.</strong>
            <span className="rl-manifesto-mark">
              <Icon name="book" size={24} />
            </span>
          </div>
          <div className="rl-about-details">
            <div className="rl-about-details-heading">
              <span className="rl-overline">WHAT RELEARN.AI BRINGS TOGETHER</span>
              <p>A learning routine, not another pile of disconnected resources.</p>
            </div>
            <article>
              <span className="rl-about-detail-index">01 / PLAN</span>
              <h3>Know what comes next.</h3>
              <p>
                Turn a skill or topic you care about into a structured learning path, then work through it step by step.
              </p>
            </article>
            <article>
              <span className="rl-about-detail-index">02 / PRACTICE</span>
              <h3>Work with the ideas.</h3>
              <p>
                Use your learning space, notes, quizzes, flashcards, and recall activities to engage with what you&apos;re studying.
              </p>
            </article>
            <article>
              <span className="rl-about-detail-index">03 / REFLECT</span>
              <h3>Keep your progress in view.</h3>
              <p>
                Return to your learning journey, review the work you&apos;ve done, and decide on a sensible next step.
              </p>
            </article>
          </div>
        </section>

        {/* Inside the Workspace Section */}
        <section className="rl-workspace-section" id="workspace">
          <div className="rl-workspace-grid">
            <div className="rl-workspace-copy">
              <div className="rl-section-index">
                <span>02</span>
                <span>INSIDE THE WORKSPACE</span>
              </div>
              <p className="rl-overline">STUDY WITH INTENTION</p>
              <h2>
                From a topic
                <br />
                to <em>real understanding.</em>
              </h2>
              <p className="rl-section-copy">
                A learning plan gives your effort direction. A focused study space gives you somewhere to work through a concept and test what you remember.
              </p>
              <ul className="rl-check-list">
                <li>
                  <span>
                    <Icon name="check" size={13} />
                  </span>
                  Keep learning steps organized
                </li>
                <li>
                  <span>
                    <Icon name="check" size={13} />
                  </span>
                  Study concepts and make notes
                </li>
                <li>
                  <span>
                    <Icon name="check" size={13} />
                  </span>
                  Practice instead of only rereading
                </li>
              </ul>
              <a
                href="#features"
                className="rl-inline-link"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('features');
                }}
              >
                Explore the learning tools <Icon name="arrow" size={16} />
              </a>
            </div>
            <div className="rl-workspace-demo">
              <RecallPreview />
              <p className="rl-demo-caption">
                <span>FIG. 02</span> An illustrative active-recall study moment.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="rl-how-section" id="how-it-works">
          <div className="rl-how-heading">
            <div className="rl-section-index">
              <span>03</span>
              <span>A PRACTICAL ROUTINE</span>
            </div>
            <h2>
              A path you can
              <br />
              <em>actually follow.</em>
            </h2>
            <p>Start with a goal. Make steady progress. Return to what matters.</p>
          </div>
          <div className="rl-steps">
            <article className="rl-step">
              <span className="rl-step-number">01</span>
              <span className="rl-step-icon">
                <Icon name="target" size={22} />
              </span>
              <div className="rl-step-copy">
                <h3>Choose a direction</h3>
                <p>Start with the subject or skill you want to understand.</p>
              </div>
              <div className="rl-step-result">
                <span>BEGIN WITH</span>
                <strong>A learning goal</strong>
              </div>
            </article>
            <article className="rl-step">
              <span className="rl-step-number">02</span>
              <span className="rl-step-icon is-blue">
                <Icon name="route" size={22} />
              </span>
              <div className="rl-step-copy">
                <h3>Follow a learning plan</h3>
                <p>Break a bigger goal into smaller, manageable steps.</p>
              </div>
              <div className="rl-step-result">
                <span>BUILD</span>
                <strong>A clear next step</strong>
              </div>
            </article>
            <article className="rl-step">
              <span className="rl-step-number">03</span>
              <span className="rl-step-icon is-teal">
                <Icon name="cards" size={22} />
              </span>
              <div className="rl-step-copy">
                <h3>Study and practice</h3>
                <p>Use available lessons, notes, quizzes, flashcards, and recall tools.</p>
              </div>
              <div className="rl-step-result">
                <span>TURN IDEAS INTO</span>
                <strong>Understanding</strong>
              </div>
            </article>
            <article className="rl-step">
              <span className="rl-step-number">04</span>
              <span className="rl-step-icon is-ink">
                <Icon name="check" size={22} />
              </span>
              <div className="rl-step-copy">
                <h3>Review what changed</h3>
                <p>Look back at your progress and decide where to go next.</p>
              </div>
              <div className="rl-step-result">
                <span>KEEP</span>
                <strong>Moving forward</strong>
              </div>
            </article>
          </div>
        </section>

        {/* Features / Toolkit Section */}
        <section className="rl-tools-section" id="features">
          <div className="rl-tools-layout">
            <div className="rl-tools-intro">
              <div className="rl-section-index">
                <span>04</span>
                <span>THE TOOLKIT</span>
              </div>
              <h2>
                Different tools.
                <br />
                <em>One learning habit.</em>
              </h2>
              <p>
                Use what helps with the task in front of you. Keep the focus on learning, not managing another complicated system.
              </p>
            </div>
            <div className="rl-tools-list">
              <article className="rl-tool-row">
                <span className="rl-tool-icon">
                  <Icon name="route" size={20} />
                </span>
                <div>
                  <h3>Personalized learning plans</h3>
                  <p>Turn a learning goal into a sequence of steps you can work through.</p>
                </div>
                <span className="rl-tool-number">01</span>
              </article>
              <article className="rl-tool-row">
                <span className="rl-tool-icon teal">
                  <Icon name="book" size={20} />
                </span>
                <div>
                  <h3>Interactive learning workspace</h3>
                  <p>Bring study steps and learning activities into a focused space.</p>
                </div>
                <span className="rl-tool-number">02</span>
              </article>
              <article className="rl-tool-row">
                <span className="rl-tool-icon slate">
                  <Icon name="note" size={20} />
                </span>
                <div>
                  <h3>Notes and cheat sheets</h3>
                  <p>Keep the main ideas and useful reminders close to your learning path.</p>
                </div>
                <span className="rl-tool-number">03</span>
              </article>
              <article className="rl-tool-row">
                <span className="rl-tool-icon">
                  <Icon name="quiz" size={20} />
                </span>
                <div>
                  <h3>Quizzes, flashcards, and recall</h3>
                  <p>Practice retrieving an idea instead of only reading it again.</p>
                </div>
                <span className="rl-tool-number">04</span>
              </article>
              <article className="rl-tool-row">
                <span className="rl-tool-icon teal">
                  <Icon name="chart" size={20} />
                </span>
                <div>
                  <h3>Progress tracking</h3>
                  <p>See the work you&apos;ve done and keep your next step in view.</p>
                </div>
                <span className="rl-tool-number">05</span>
              </article>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="rl-cta-section" id="get-started">
          <div className="rl-cta-stamp">
            <Icon name="book" size={25} />
            <span>RELEARN.AI</span>
          </div>
          <div className="rl-cta-content">
            <p className="rl-overline">YOUR NEXT STEP STARTS HERE</p>
            <h2>
              Start with something
              <br />
              you want to <em>learn.</em>
            </h2>
            <p>Choose a goal. Make a little progress. Come back tomorrow.</p>
            <button
              type="button"
              className="rl-button rl-button-light"
              onClick={handleGetStarted}
            >
              Get started with Relearn.ai <Icon name="arrow" size={17} />
            </button>
          </div>
          <div className="rl-cta-side-note">
            GOOD LEARNING
            <br />
            TAKES PRACTICE.
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="rl-footer">
        <div className="rl-footer-main">
          <div className="rl-footer-brand">
            <BrandLogo onClick={() => scrollToSection('top')} />
            <p>
              A clearer path from curiosity
              <br />
              to understanding.
            </p>
            <span className="rl-footer-signature">
              — Team Relearn.ai <i aria-hidden="true" />
            </span>
          </div>
          <div className="rl-footer-links">
            <div>
              <span>EXPLORE</span>
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('features');
                }}
              >
                Features
              </a>
              <a
                href="#workspace"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('workspace');
                }}
              >
                Workspace
              </a>
              <a
                href="#how-it-works"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('how-it-works');
                }}
              >
                How it works
              </a>
            </div>
            <div>
              <span>RELEARN.AI</span>
              <a
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('about');
                }}
              >
                About us
              </a>
              <a
                href="#get-started"
                onClick={(e) => {
                  e.preventDefault();
                  handleGetStarted();
                }}
              >
                Get started
              </a>
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('top');
                }}
              >
                Back to top ↑
              </a>
            </div>
          </div>
          <div className="rl-footer-support">
            <span className="rl-footer-section-label">DIRECT CHANNELS &amp; SUPPORT</span>
            <a className="rl-footer-email" href="mailto:imposterz.rev02@gmail.com">
              <Icon name="mail" size={17} />
              <span>imposterz.rev02@gmail.com</span>
            </a>
            <a className="rl-footer-email" href="mailto:imposterz.rith08@gmail.com">
              <Icon name="mail" size={17} />
              <span>imposterz.rith08@gmail.com</span>
            </a>
            <p>Questions, feedback, or ideas? Reach out to the Relearn.ai team.</p>
          </div>
        </div>
        <div className="rl-footer-bottom">
          <span>© Relearn.ai</span>
          <span>Made for learning that lasts.</span>
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('top');
            }}
          >
            Back to top ↑
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
