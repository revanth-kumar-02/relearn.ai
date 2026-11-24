/**
 * Mandatory Evaluation Scenarios for Video Recommendation Pipeline Repair
 *
 * Verifies:
 * 1. Data Analyst: Excel Data Cleaning (Must accept Excel cleaning, reject Cursor/Big Data/PowerBI)
 * 2. Data Analyst: Power BI DAX Formulas (Must accept DAX, reject Excel/Python)
 * 3. Web Dev: HTML Semantic Structure (Must accept HTML semantics/forms, reject React)
 * 4. Python Programming: Loops (Must accept Python loops, reject JS loops and advanced OOP)
 * 5. Language Preference: Tamil (Must accept Tamil videos, hard reject English videos)
 */

import {
  classifyEducationalRelevance,
  verifyLanguageMatch,
  filterAndRankCandidates,
  StructuredLessonContext
} from '../youtubeService';

interface MockVideo {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics?: {
    viewCount?: string;
  };
}

function createMockVideo(
  id: string,
  title: string,
  description: string,
  channelTitle: string,
  viewCount: string = '100000'
): MockVideo {
  return {
    id,
    snippet: {
      title,
      description,
      channelTitle,
      publishedAt: '2024-01-01T00:00:00Z',
      thumbnails: {
        medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` }
      }
    },
    statistics: { viewCount }
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING MANDATORY VIDEO RELEVANCE EVALUATION SUITE');
console.log('======================================================\n');

// ─────────────────────────────────────────────────────────────
// Scenario 1: Data Analyst — Excel Data Cleaning
// ─────────────────────────────────────────────────────────────
console.log('--- SCENARIO 1: Data Analyst — Excel Data Cleaning ---');
{
  const context: StructuredLessonContext = {
    planTitle: 'Data Analyst for Beginners',
    subject: 'Data Analyst',
    difficulty: 'Beginner',
    lessonTitle: 'Data Cleaning Using Excel',
    learningObjective: 'Understand missing values, identify duplicate records, clean inconsistent data, apply data validation in spreadsheets',
    lessonDescription: 'Hands-on practice cleaning raw datasets with Excel formulas and tools',
    requiredTools: ['excel'],
    preferredLanguage: 'en',
  };

  const pool: MockVideo[] = [
    // Target matches
    createMockVideo('ex-1', 'Excel Data Cleaning Tutorial for Beginners', 'Learn how to clean messy data in Excel step by step', 'Kevin Stratvert', '500000'),
    createMockVideo('ex-2', 'Handling Missing Values and Removing Duplicates in Excel', 'Practical guide to identifying nulls and deduplicating in Excel spreadsheets', 'Chandoo', '350000'),
    // Production bugs to be rejected
    createMockVideo('bad-1', 'Cursor Tutorial for Beginners (AI Code Editor)', 'Get started with Cursor AI IDE for coding', 'Tech With Tim', '1200000'),
    createMockVideo('bad-2', 'Big Data In 5 Minutes | What Is Big Data? | Big Data Tutorial', 'Overview of Hadoop, Spark and Big Data architectures', 'Simplilearn', '2300000'),
    createMockVideo('bad-3', 'Your first 10 minutes of Power BI - A no nonsense guide', 'Getting started with Power BI desktop reports', 'Chandoo', '800000'),
    createMockVideo('bad-4', 'A Beginners Guide To The Data Analysis Process', 'High level overview of what a data analyst does from ask to act', 'CareerFoundry', '950000'),
  ];

  const results = filterAndRankCandidates(pool as any, context);

  assert(results.some(v => v.id === 'ex-1'), 'Direct match "Excel Data Cleaning" accepted');
  assert(results.some(v => v.id === 'ex-2'), 'Prerequisite/Concept match "Missing Values in Excel" accepted');
  assert(!results.some(v => v.id === 'bad-1'), 'Cursor AI Code Editor video HARD REJECTED');
  assert(!results.some(v => v.id === 'bad-2'), 'Big Data in 5 Minutes video HARD REJECTED');
  assert(!results.some(v => v.id === 'bad-3'), 'Power BI video HARD REJECTED (conflicting tool)');
  assert(!results.some(v => v.id === 'bad-4'), 'Generic Data Analysis Process overview REJECTED (does not teach lesson)');

  const cursorEval = classifyEducationalRelevance(pool[2] as any, context);
  assert(cursorEval.tier === 'UNRELATED' && !cursorEval.isEligible, 'Cursor is strictly classified as UNRELATED');
}

// ─────────────────────────────────────────────────────────────
// Scenario 2: Data Analyst — Power BI DAX Formulas
// ─────────────────────────────────────────────────────────────
console.log('\n--- SCENARIO 2: Data Analyst — Power BI DAX Formulas ---');
{
  const context: StructuredLessonContext = {
    planTitle: 'Data Analyst for Beginners',
    subject: 'Data Analyst',
    difficulty: 'Beginner',
    lessonTitle: 'Writing DAX Measures and Calculated Columns in Power BI',
    learningObjective: 'Learn CALCULATE, SUMX, FILTER, and basic DAX expressions in Power BI',
    requiredTools: ['power bi'],
    preferredLanguage: 'en',
  };

  const pool: MockVideo[] = [
    createMockVideo('pbi-1', 'Power BI DAX Tutorial for Beginners - CALCULATE & Measures', 'Master DAX formulas in Power BI desktop step by step', 'Avi Singh', '400000'),
    createMockVideo('pbi-2', 'Calculated Columns vs Measures in Power BI Explained', 'Understand the fundamental difference in Power BI data models', 'Guy in a Cube', '600000'),
    createMockVideo('bad-p1', 'Excel Pivot Tables Masterclass', 'Master pivot tables and charts in Microsoft Excel', 'Leila Gharani', '1500000'),
    createMockVideo('bad-p2', 'Python for Data Science - Full Course', 'Complete course on Python, Pandas, and NumPy for analysis', 'freeCodeCamp', '5000000'),
  ];

  const results = filterAndRankCandidates(pool as any, context);

  assert(results.some(v => v.id === 'pbi-1'), 'Power BI DAX video accepted');
  assert(results.some(v => v.id === 'pbi-2'), 'Calculated Columns in Power BI accepted');
  assert(!results.some(v => v.id === 'bad-p1'), 'Excel Pivot Tables video HARD REJECTED for Power BI DAX lesson');
  assert(!results.some(v => v.id === 'bad-p2'), 'Python Data Science video HARD REJECTED for Power BI lesson');
}

// ─────────────────────────────────────────────────────────────
// Scenario 3: Web Development — HTML Semantic Structure
// ─────────────────────────────────────────────────────────────
console.log('\n--- SCENARIO 3: Web Development — HTML Semantic Structure & Forms ---');
{
  const context: StructuredLessonContext = {
    planTitle: 'Full Stack Web Development',
    subject: 'Web Development',
    difficulty: 'Beginner',
    lessonTitle: 'HTML5 Semantic Elements and Accessible Forms',
    learningObjective: 'Understand header, nav, main, article, section, and input form validations in HTML5',
    requiredTools: ['html'],
    preferredLanguage: 'en',
  };

  const pool: MockVideo[] = [
    createMockVideo('html-1', 'HTML5 Semantic Elements Explained - Web Structure Tutorial', 'Learn header, nav, article, section, and footer elements', 'Traversy Media', '450000'),
    createMockVideo('html-2', 'Building HTML Forms for Beginners - Complete Guide', 'Inputs, validation, labels, and accessible form design in HTML', 'Web Dev Simplified', '320000'),
    createMockVideo('bad-h1', 'React 19 Full Course 2026 - Master Modern React', 'Build complex React components, hooks, and context apps', 'freeCodeCamp', '1800000'),
    createMockVideo('bad-h2', 'Learn JavaScript in 1 Hour', 'Modern ES6 JavaScript fundamentals crash course', 'Programming with Mosh', '3500000'),
  ];

  const results = filterAndRankCandidates(pool as any, context);

  assert(results.some(v => v.id === 'html-1'), 'HTML5 Semantic Elements video accepted');
  assert(results.some(v => v.id === 'html-2'), 'Building HTML Forms video accepted');
  assert(!results.some(v => v.id === 'bad-h1'), 'React 19 full course HARD REJECTED for beginner HTML lesson');
  assert(!results.some(v => v.id === 'bad-h2'), 'JavaScript in 1 Hour REJECTED (wrong technology)');
}

// ─────────────────────────────────────────────────────────────
// Scenario 4: Python Programming — Loops & Iteration
// ─────────────────────────────────────────────────────────────
console.log('\n--- SCENARIO 4: Python Programming — Loops & Iteration ---');
{
  const context: StructuredLessonContext = {
    planTitle: 'Python Programming Masterclass',
    subject: 'Python',
    difficulty: 'Beginner',
    lessonTitle: 'For Loops and While Loops in Python',
    learningObjective: 'Iterate over lists, use range(), break, continue, and while loops in Python',
    requiredTools: ['python'],
    preferredLanguage: 'en',
  };

  const pool: MockVideo[] = [
    createMockVideo('py-1', 'Python Loops Tutorial - For Loops and While Loops for Beginners', 'How to use for loops, while loops, and range() in Python 3', 'Corey Schafer', '850000'),
    createMockVideo('py-2', 'Python For Loops in 10 Minutes', 'Clear step by step explanation of loop iteration in Python', 'Bro Code', '420000'),
    createMockVideo('bad-py1', 'JavaScript Loops Tutorial - For, While, and Do While', 'Complete guide to loops in JS', 'Traversy Media', '600000'),
    createMockVideo('bad-py2', 'Python Object Oriented Programming - Advanced Metaclasses', 'Deep dive into Python __new__, __init__, and metaclasses for senior devs', 'ArjanCodes', '150000'),
    createMockVideo('bad-py3', 'Rust Memory Safety & Borrow Checker Explained', 'How rust ownership works', 'Fireship', '900000'),
  ];

  const results = filterAndRankCandidates(pool as any, context);

  assert(results.some(v => v.id === 'py-1'), 'Python Loops Tutorial accepted');
  assert(results.some(v => v.id === 'py-2'), 'Python For Loops in 10 Min accepted');
  assert(!results.some(v => v.id === 'bad-py1'), 'JavaScript Loops HARD REJECTED (competing language)');
  assert(!results.some(v => v.id === 'bad-py2'), 'Advanced Metaclasses REJECTED (difficulty mismatch for beginner loop lesson)');
  assert(!results.some(v => v.id === 'bad-py3'), 'Rust Memory Safety HARD REJECTED (unrelated language)');
}

// ─────────────────────────────────────────────────────────────
// Scenario 5: Strict Language Preference — Tamil
// ─────────────────────────────────────────────────────────────
console.log('\n--- SCENARIO 5: Strict Language Preference — Tamil (ta) ---');
{
  const context: StructuredLessonContext = {
    planTitle: 'Data Analyst for Beginners',
    subject: 'Data Analyst',
    difficulty: 'Beginner',
    lessonTitle: 'Data Cleaning Using Excel',
    learningObjective: 'Clean data, remove duplicates, handle missing values in Excel',
    requiredTools: ['excel'],
    preferredLanguage: 'ta',
  };

  const pool: MockVideo[] = [
    // Authentic Tamil videos
    createMockVideo('ta-1', 'Excel Data Cleaning Tutorial in Tamil | தமிழ் டுடோரியல்', 'எக்செல் டேட்டா கிளீனிங் எளிய தமிழில் கற்றுக்கொள்ளுங்கள்', 'Tamil Tech Tutor', '120000'),
    createMockVideo('ta-2', 'How to Remove Duplicates & Clean Data in Excel - Tamil Tutorial', 'Excel duplicates removal tutorial in Tamil', 'Code Tamilan', '85000'),
    // English videos (must NOT be accepted when preference is Tamil)
    createMockVideo('eng-1', 'Cursor Tutorial for Beginners (AI Code Editor)', 'Tech With Tim in English', 'Tech With Tim', '1200000'),
    createMockVideo('eng-2', 'Excel Data Cleaning Tutorial for Beginners', 'English tutorial by Kevin Stratvert', 'Kevin Stratvert', '2000000'),
  ];

  const results = filterAndRankCandidates(pool as any, context);

  assert(results.some(v => v.id === 'ta-1'), 'Authentic Tamil video with Tamil script accepted');
  assert(results.some(v => v.id === 'ta-2'), 'Tamil video with Tamil language keyword accepted');
  assert(!results.some(v => v.id === 'eng-1'), 'English Cursor video HARD REJECTED on Tamil language search');
  assert(!results.some(v => v.id === 'eng-2'), 'English Excel video HARD REJECTED from Tamil recommendation list (No misleading English under Tamil banner)');

  // Verify verifyLanguageMatch function directly
  const taMatch1 = verifyLanguageMatch(pool[0].snippet.title, pool[0].snippet.description, pool[0].snippet.channelTitle, 'ta');
  const engMatch = verifyLanguageMatch(pool[2].snippet.title, pool[2].snippet.description, pool[2].snippet.channelTitle, 'ta');

  assert(taMatch1.isMatch && taMatch1.detectedScript === 'tamil', 'verifyLanguageMatch detects Tamil script correctly');
  assert(!engMatch.isMatch, 'verifyLanguageMatch identifies English video as NOT matching Tamil');
}

// ─────────────────────────────────────────────────────────────
// Scenario 6: C# — Day 1: Development Environment Setup
// ─────────────────────────────────────────────────────────────
console.log('\n--- SCENARIO 6: C# — Day 1: Development Environment Setup ---');
{
  const context: StructuredLessonContext = {
    planTitle: '30-Day Beginner C# Learning Plan',
    subject: 'AI Generated', // Testing resilience even when subject is set to legacy "AI Generated"
    difficulty: 'Beginner',
    lessonTitle: 'Day 1: Development Environment Setup',
    learningObjective: 'Install Visual Studio Community and .NET SDK, verify with dotnet --version.',
    lessonDescription: 'Install Visual Studio Community and .NET SDK, verify with dotnet --version.',
    preferredLanguage: 'en',
  };

  const pool: MockVideo[] = [
    // Authentic C# environment setup tutorials
    createMockVideo('cs-1', 'How to Setup C# and .NET in Visual Studio 2026', 'Complete guide to setting up your C# development environment and creating your first console app.', 'Tim Corey', '450000'),
    createMockVideo('cs-2', 'C# VS Code Setup - Run .NET 8 CSharp in 5 Minutes', 'Step by step C# environment setup in Visual Studio Code with .NET SDK.', 'Nick Chapsas', '320000'),
    // Production bugs from user screenshots (MUST BE HARD REJECTED)
    createMockVideo('bad-kiro', 'Kiro IDE for Beginners | Download, Install & Setup | Day 1/30 Challenge', 'Setup Kiro IDE for development', 'Aniso all study88', '834'),
    createMockVideo('bad-mern', 'MERN STACK - Environment Setup | Complete Tutorial', 'MongoDB, Express, React, Node.js development environment setup tutorial', 'WsCube Tech', '109000'),
    createMockVideo('bad-sharepoint', '(old video) SharePoint Framework Tutorial - Setting up your development environment', 'SPFx development environment setup guide', 'Microsoft Community Learning', '18000'),
    createMockVideo('bad-go', 'Introduction to Go, part 2: Setting Up a Development Environment', 'Setting up Go programming language environment in VS Code', 'Failing Forward', '18000'),
    createMockVideo('bad-claude-1', 'FULL Claude Code Tutorial for Beginners in 2026! (Step-By-Step)', 'How to use Claude Code agent in terminal', 'Tech With Tim', '423000'),
    createMockVideo('bad-claude-2', 'Ultimate Claude Code Tutorial: How to Use Claude Code for Beginners in 2026', 'Complete Claude Code workflow', 'AI Master', '232000'),
    createMockVideo('bad-opencode', 'OpenCode + Ollama (Full Tutorial) - Local AI Coding Setup in 2026', 'Local AI coding setup with Ollama and OpenCode', 'AI Geek', '180000'),
    createMockVideo('bad-cursor', 'Claude Code + Cursor + GitHub: The New AI environment setup', 'Setup AI development tools', 'Dev Queen', '210000'),
    createMockVideo('bad-py-env', 'Python Environment Setup in VS Code for Beginners', 'Setup Python 3 and virtual environments', 'Corey Schafer', '800000'),
  ];

  const results = filterAndRankCandidates(pool as any, context);

  assert(results.some(v => v.id === 'cs-1'), 'C# Visual Studio setup video ACCEPTED');
  assert(results.some(v => v.id === 'cs-2'), 'C# VS Code .NET 8 video ACCEPTED');
  assert(!results.some(v => v.id === 'bad-kiro'), 'Kiro IDE video HARD REJECTED for C# lesson');
  assert(!results.some(v => v.id === 'bad-mern'), 'MERN Stack Environment Setup HARD REJECTED for C# lesson');
  assert(!results.some(v => v.id === 'bad-sharepoint'), 'SharePoint Framework video HARD REJECTED for C# lesson');
  assert(!results.some(v => v.id === 'bad-go'), 'Introduction to Go video HARD REJECTED for C# lesson');
  assert(!results.some(v => v.id === 'bad-claude-1'), 'Tech With Tim Claude Code video HARD REJECTED for C# lesson');
  assert(!results.some(v => v.id === 'bad-claude-2'), 'AI Master Claude Code video HARD REJECTED for C# lesson');
  assert(!results.some(v => v.id === 'bad-opencode'), 'OpenCode + Ollama video HARD REJECTED for C# lesson');
  assert(!results.some(v => v.id === 'bad-cursor'), 'Claude Code + Cursor video HARD REJECTED for C# lesson');
  assert(!results.some(v => v.id === 'bad-py-env'), 'Python Environment Setup HARD REJECTED for C# lesson');

  // Verify dynamic reason generation
  const cs1Video = results.find(v => v.id === 'cs-1');
  assert(
    !!cs1Video && cs1Video.reason !== 'Foundational concept for Day 1: Development Environment Setup',
    'Dynamic relevance subtext generated (Not static generic placeholder)'
  );
  assert(
    !!cs1Video && cs1Video.reason.toLowerCase().includes('c#'),
    'Relevance reason explicitly highlights C# technology'
  );

  const kiroEval = classifyEducationalRelevance(pool[2] as any, context);
  assert(kiroEval.tier === 'UNRELATED' && !kiroEval.isEligible, 'Kiro IDE is strictly classified as UNRELATED');

  const mernEval = classifyEducationalRelevance(pool[3] as any, context);
  assert(mernEval.tier === 'UNRELATED' && !mernEval.isEligible, 'MERN Stack is strictly classified as UNRELATED');

  const spEval = classifyEducationalRelevance(pool[4] as any, context);
  assert(spEval.tier === 'UNRELATED' && !spEval.isEligible, 'SharePoint is strictly classified as UNRELATED');

  const goEval = classifyEducationalRelevance(pool[5] as any, context);
  assert(goEval.tier === 'UNRELATED' && !goEval.isEligible, 'Go language is strictly classified as UNRELATED');
}

// ─────────────────────────────────────────────────────────────
// Scenario 7: C Programming — Day 1: Development Environment Setup (Test A)
// ─────────────────────────────────────────────────────────────
console.log('\n--- SCENARIO 7: C Programming — Day 1: Development Environment Setup ---');
{
  const context: StructuredLessonContext = {
    planTitle: 'C Programming for Beginners',
    subject: 'C Programming',
    difficulty: 'Beginner',
    lessonTitle: 'Day 1: Development Environment Setup',
    learningObjective: 'Install GCC compiler with MinGW, configure VS Code for C programming, and run first C program',
    lessonDescription: 'Set up C compiler and develop your first Hello World in C',
    preferredLanguage: 'en',
  };

  const pool: MockVideo[] = [
    // Authentic C Environment Setup Tutorials (High and acceptable popularity)
    createMockVideo('c-1', 'Install a C Compiler for Beginners (GCC & MinGW Setup)', 'Complete guide to installing GCC and MinGW on Windows for C programming.', 'Bro Code', '250000'),
    createMockVideo('c-2', 'C Programming in Visual Studio Code - Complete Setup Guide', 'How to set up and configure C compiler in VS Code editor.', 'FreeCodeCamp', '480000'),
    createMockVideo('c-3', 'How to Write and Run Your First C Program', 'Step by step tutorial to write, compile and execute your first C program with GCC.', 'Caleb Curry', '850000'),
    // Production bugs observed in latest report (MUST BE HARD REJECTED)
    createMockVideo('bad-cursor-c', 'Cursor Tutorial for Beginners (AI Code Editor)', 'Learn the Cursor AI code editor for development', 'Tech With Tim', '1200000'),
    createMockVideo('bad-lowview-c', 'How to Set Up Your C Programming Environment', 'Quick unvetted desktop screen record setup', 'Unknown Dev', '158'),
    createMockVideo('bad-bangla-c', 'The C Programming Language in বাংলা', 'সম্পূর্ণ বাংলায় সি প্রোগ্রামিং শিখুন - Complete C Tutorial in Bangla', 'Bangla Tech', '95000'),
    createMockVideo('bad-csharp-c', 'How to Setup C# and .NET in Visual Studio 2026', 'Complete guide to C# .NET SDK environment setup', 'Tim Corey', '450000'),
    createMockVideo('bad-go-c', 'Introduction to Go, part 2: Setting Up a Development Environment', 'Setting up Go language in VS Code', 'Failing Forward', '18000'),
  ];

  const results = filterAndRankCandidates(pool as any, context);

  // Assertions for accepted authentic C tutorials
  assert(results.some(v => v.id === 'c-1'), 'C Compiler GCC & MinGW setup video ACCEPTED');
  assert(results.some(v => v.id === 'c-2'), 'C Programming in VS Code video ACCEPTED');
  assert(results.some(v => v.id === 'c-3'), 'First C Program with GCC video ACCEPTED');

  // Assertions for hard rejection of production failures
  assert(!results.some(v => v.id === 'bad-cursor-c'), 'Cursor AI (1.2M views) HARD REJECTED for C lesson (Tech mismatch)');
  assert(!results.some(v => v.id === 'bad-lowview-c'), '158-view recording HARD REJECTED by popularity policy (< 5,000 views)');
  assert(!results.some(v => v.id === 'bad-bangla-c'), 'Bengali C tutorial in বাংলা HARD REJECTED when English is selected');
  assert(!results.some(v => v.id === 'bad-csharp-c'), 'C# .NET SDK setup HARD REJECTED for pure C lesson');
  assert(!results.some(v => v.id === 'bad-go-c'), 'Go language setup HARD REJECTED for C lesson');

  // Verify dynamic subtext explicitly mentions C
  const c1Video = results.find(v => v.id === 'c-1');
  assert(
    !!c1Video && c1Video.reason.toLowerCase().includes('c programming'),
    'Relevance reason explicitly highlights C Programming technology'
  );

  // Verify specific classification decisions
  const cursorEval = classifyEducationalRelevance(pool[3] as any, context);
  assert(cursorEval.tier === 'UNRELATED' && !cursorEval.isEligible, 'Cursor AI is strictly classified as UNRELATED');

  const lowViewEval = classifyEducationalRelevance(pool[4] as any, context);
  assert(!lowViewEval.isEligible && lowViewEval.reason.includes('Insufficient view count'), '158-view video rejected with Insufficient view count reason');

  const banglaEval = classifyEducationalRelevance(pool[5] as any, context);
  assert(!banglaEval.isEligible && banglaEval.reason.includes('Language mismatch'), 'Bengali video rejected with Language mismatch reason');
}

// ─────────────────────────────────────────────────────────────
// Scenario 8: Strict Language Gating for English Mode (Test D)
// ─────────────────────────────────────────────────────────────
console.log('\n--- SCENARIO 8: Strict Language Gating for English Mode ---');
{
  // Bengali in English mode
  const bnCheck = verifyLanguageMatch(
    'The C Programming Language in বাংলা',
    'সম্পূর্ণ বাংলায় সি প্রোগ্রামিং শিখুন',
    'Bangla Coding',
    'en'
  );
  assert(!bnCheck.isMatch && bnCheck.detectedScript === 'bengali', 'Bengali script (বাংলা) strictly rejected in English mode');

  // Hindi in English mode
  const hiCheck = verifyLanguageMatch(
    'C Programming Full Course in Hindi | हिंदी டுடோரியல்',
    'Complete C tutorial in Hindi',
    'Code With Harry',
    'en'
  );
  assert(!hiCheck.isMatch && hiCheck.detectedScript === 'hindi', 'Hindi script and keywords strictly rejected in English mode');

  // Tamil in English mode
  const taCheck = verifyLanguageMatch(
    'C Programming Tutorial in Tamil | தமிழ்',
    'Learn C in Tamil step by step',
    'Tamil Tech',
    'en'
  );
  assert(!taCheck.isMatch && taCheck.detectedScript === 'tamil', 'Tamil script and keywords strictly rejected in English mode');

  // Authentic English video
  const enCheck = verifyLanguageMatch(
    'C Programming Tutorial for Beginners - Full Course',
    'Learn C programming step by step with GCC and VS Code',
    'freeCodeCamp.org',
    'en'
  );
  assert(enCheck.isMatch && enCheck.detectedScript === 'latin', 'Authentic English video accepted in English mode');
}

// ─────────────────────────────────────────────────────────────
// Scenario 9: Popularity & Quality Tier Comparison (Test E)
// ─────────────────────────────────────────────────────────────
console.log('\n--- SCENARIO 9: Popularity & Quality Tier Comparison ---');
{
  const context: StructuredLessonContext = {
    planTitle: 'C Programming for Beginners',
    subject: 'C Programming',
    difficulty: 'Beginner',
    lessonTitle: 'C Variables and Data Types',
    learningObjective: 'Learn int, float, char, and double in C programming',
    preferredLanguage: 'en',
  };

  const pool: MockVideo[] = [
    createMockVideo('p-150k', 'C Variables and Data Types Explained', 'Complete guide to int, float, double and char in C', 'Neso Academy', '150000'),
    createMockVideo('p-25k', 'Variables in C Programming - Quick Tutorial', 'Variables in C step by step', 'Jenny Lectures', '25000'),
    createMockVideo('p-150', 'Variables in C Tutorial', 'Quick recording', 'Random Dev', '150'),
    createMockVideo('p-2m-bad', 'Cursor AI Coding Complete Workflow', 'How to use Cursor AI', 'Fireship', '2000000'),
  ];

  const results = filterAndRankCandidates(pool as any, context);

  assert(!results.some(v => v.id === 'p-2m-bad'), '2M view Cursor AI video REJECTED (Relevance strictly trumps popularity)');
  assert(!results.some(v => v.id === 'p-150'), '150-view video REJECTED by popularity policy (< 5,000 views)');
  assert(results.some(v => v.id === 'p-150k'), '150,000-view video ACCEPTED in high popularity tier');
  assert(results.some(v => v.id === 'p-25k'), '25,000-view video ACCEPTED in standard popularity tier');

  // Verify rank ordering: 150k view video ranked above 25k view video
  const idx150k = results.findIndex(v => v.id === 'p-150k');
  const idx25k = results.findIndex(v => v.id === 'p-25k');
  assert(idx150k < idx25k, '150k view video ranked ahead of 25k view video');
}

// ─────────────────────────────────────────────────────────────
// Scenario 10: Cross-Plan Isolation Between C and C# (Test F)
// ─────────────────────────────────────────────────────────────
console.log('\n--- SCENARIO 10: Cross-Plan Isolation Between C and C# ---');
{
  const cContext: StructuredLessonContext = {
    planTitle: '30-Day C Programming Masterclass',
    subject: 'C Programming',
    difficulty: 'Beginner',
    lessonTitle: 'Day 1: Development Environment Setup',
    learningObjective: 'Setup GCC compiler and VS Code for C',
    preferredLanguage: 'en',
  };

  const csharpContext: StructuredLessonContext = {
    planTitle: '30-Day C# Programming Masterclass',
    subject: 'C# Programming',
    difficulty: 'Beginner',
    lessonTitle: 'Day 1: Development Environment Setup',
    learningObjective: 'Setup Visual Studio and .NET SDK for C#',
    preferredLanguage: 'en',
  };

  const mixedPool: MockVideo[] = [
    createMockVideo('c-gcc', 'Install GCC Compiler for C Programming', 'GCC and MinGW for C', 'Bro Code', '300000'),
    createMockVideo('cs-dotnet', 'Install .NET 8 SDK and Visual Studio for C#', '.NET SDK setup for C#', 'Tim Corey', '300000'),
  ];

  const cResults = filterAndRankCandidates(mixedPool as any, cContext);
  const csResults = filterAndRankCandidates(mixedPool as any, csharpContext);

  assert(cResults.some(v => v.id === 'c-gcc') && !cResults.some(v => v.id === 'cs-dotnet'), 'C Plan returns C tutorials and strictly excludes C#');
  assert(csResults.some(v => v.id === 'cs-dotnet') && !csResults.some(v => v.id === 'c-gcc'), 'C# Plan returns C# tutorials and strictly excludes C');
}

console.log('\n======================================================');
console.log(`📊 TEST SUITE SUMMARY: ${passedTests} / ${totalTests} ASSERTIONS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('======================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
