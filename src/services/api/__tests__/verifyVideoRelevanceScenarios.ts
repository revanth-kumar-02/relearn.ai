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

console.log('\n======================================================');
console.log(`📊 TEST SUITE SUMMARY: ${passedTests} / ${totalTests} ASSERTIONS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('======================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
