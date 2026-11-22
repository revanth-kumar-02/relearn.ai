/**
 * ─────────────────────────────────────────────────────────────────
 *  Relearn.ai — Dynamic Tier-Based LLM Project Blueprint Service
 * ─────────────────────────────────────────────────────────────────
 *
 *  Wires project creation 100% to the LLM pipeline:
 *  - 10 projects for Beginner
 *  - 10 projects for Intermediate
 *  - 10 projects for Advanced / Hard
 *  Total 30 unique, production-grade projects per plan!
 */

import { Plan } from '../../types';
import { ProjectLab, ProjectMilestone } from './projectLabService';
import { generateAI } from './pipeline';
import { sanitizeInput } from '../../utils/sanitize';
import { safeParseAIResponse } from '../../utils/aiUtils';
import { lsGet, lsSet } from '../storage/storageService';

export type ProjectDifficultyTier = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ProjectVirtualFile {
  id: string;
  name: string;
  path: string;
  language: string;
  content: string;
  isEntrypoint?: boolean;
}

export interface ProjectBlueprint {
  id: string;
  title: string;
  tagline: string;
  domain: string;
  technology: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedHours: number;
  realWorldScenario: string;
  techStack: string[];
  architectureOverview: string;
  keyChallenges: string[];
  files: ProjectVirtualFile[];
  milestoneObjectives: Array<{
    title: string;
    objective: string;
    starterHint: string;
    criteria: string[];
  }>;
}

const STORAGE_PREFIX = 'blueprints_tier_v3_';

/**
 * High-precision technology and language extractor.
 * Prevents plans from defaulting to "AI Generated" or generic text.
 */
export function extractTechnologyFromPlan(plan: Plan): string {
  if (
    plan.subject &&
    !plan.subject.toLowerCase().includes('ai generated') &&
    plan.subject.toLowerCase() !== 'general' &&
    plan.subject.trim() !== ''
  ) {
    return plan.subject.trim();
  }

  const textToScan = `${plan.title} ${plan.description || ''}`;

  if (/\b(c#|csharp|\.net|dotnet)\b/i.test(textToScan)) return 'C# / .NET';
  if (/\b(rust|cargo|rustup)\b/i.test(textToScan)) return 'Rust';
  if (/\b(flutter|dart)\b/i.test(textToScan)) return 'Flutter / Dart';
  if (/\b(python|django|fastapi|flask|numpy|pandas)\b/i.test(textToScan)) return 'Python';
  if (/\b(typescript|ts)\b/i.test(textToScan)) return 'TypeScript';
  if (/\b(react|react\.js|next\.js|nextjs)\b/i.test(textToScan)) return 'React';
  if (/\b(javascript|js|node\.js|nodejs|express)\b/i.test(textToScan)) return 'JavaScript';
  if (/\b(golang|go)\b/i.test(textToScan)) return 'Go';
  if (/\b(c\+\+|cpp)\b/i.test(textToScan)) return 'C++';
  if (/\b(java|spring|spring\s*boot)\b/i.test(textToScan)) return 'Java';
  if (/\b(kotlin|android)\b/i.test(textToScan)) return 'Kotlin / Android';
  if (/\b(swift|swiftui|ios)\b/i.test(textToScan)) return 'Swift / iOS';
  if (/\b(sql|postgres|postgresql|mysql|database)\b/i.test(textToScan)) return 'SQL & Databases';

  const clean = plan.title
    .replace(/\b\d+[- ](?:day|week|month)\b/gi, '')
    .replace(/\b(?:beginner|intermediate|advanced|mastery|learning|plan|crash\s*course|guide|roadmap|bootcamp)\b/gi, '')
    .trim();

  return clean || plan.title || 'Software Engineering';
}

/**
 * Fetches 10 projects for a specific difficulty tier ('Beginner' | 'Intermediate' | 'Advanced')
 * using the LLM pipeline.
 */
export async function getTierBlueprintsForPlan(
  plan: Plan,
  tier: ProjectDifficultyTier,
  forceFresh: boolean = false
): Promise<ProjectBlueprint[]> {
  if (!plan?.id) return [];

  const targetTech = extractTechnologyFromPlan(plan);
  const cacheKey = `${STORAGE_PREFIX}${plan.id}_${tier.toLowerCase()}`;

  if (!forceFresh) {
    const cached = lsGet<ProjectBlueprint[] | null>(cacheKey, null);
    const hasCorruptedData = cached?.some(
      (p) => p.title.includes('AI Generated') || p.technology === 'AI Generated'
    );

    if (cached && Array.isArray(cached) && cached.length >= 8 && !hasCorruptedData) {
      return cached;
    }
  }

  const fresh = await generate10UniqueProjectsForTierWithLLM(plan, targetTech, tier);
  if (fresh && fresh.length > 0) {
    lsSet(cacheKey, fresh);
    return fresh;
  }

  return generateTechSpecificFallbackBlueprints(plan, targetTech, tier);
}

/**
 * Fetches all 30 projects across all three difficulty tiers:
 * - 10 Beginner
 * - 10 Intermediate
 * - 10 Advanced / Hard
 */
export async function getAllTiersBlueprintsForPlan(
  plan: Plan,
  forceFresh: boolean = false
): Promise<{
  beginner: ProjectBlueprint[];
  intermediate: ProjectBlueprint[];
  advanced: ProjectBlueprint[];
  all: ProjectBlueprint[];
}> {
  const [beginner, intermediate, advanced] = await Promise.all([
    getTierBlueprintsForPlan(plan, 'Beginner', forceFresh),
    getTierBlueprintsForPlan(plan, 'Intermediate', forceFresh),
    getTierBlueprintsForPlan(plan, 'Advanced', forceFresh),
  ]);

  return {
    beginner,
    intermediate,
    advanced,
    all: [...beginner, ...intermediate, ...advanced],
  };
}

/**
 * Backward-compatible helper for legacy callers.
 * Defaults to the 10 Beginner blueprints.
 */
export async function get10BlueprintsForPlan(
  plan: Plan,
  forceFresh: boolean = false
): Promise<ProjectBlueprint[]> {
  return getTierBlueprintsForPlan(plan, 'Beginner', forceFresh);
}

/**
 * Calls the AI pipeline to synthesize 10 creative, non-trivial engineering projects
 * strictly constrained to the chosen difficulty tier (Beginner, Intermediate, or Advanced/Hard).
 */
async function generate10UniqueProjectsForTierWithLLM(
  plan: Plan,
  targetTech: string,
  tier: ProjectDifficultyTier
): Promise<ProjectBlueprint[]> {
  const randomSeed = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const planDesc = plan.description || `Curriculum for ${targetTech}`;

  const tierGuidance =
    tier === 'Beginner'
      ? 'All 10 projects MUST be strictly Beginner difficulty: foundational syntax, CLI tools, basic file I/O, introductory models, clean terminal utilities, minimal APIs, and simple UI components.'
      : tier === 'Intermediate'
      ? 'All 10 projects MUST be strictly Intermediate difficulty: relational/NoSQL database integration, multi-threading and asynchronous I/O, REST/gRPC microservices, state management, caching, WebSockets, and component architecture.'
      : 'All 10 projects MUST be strictly Advanced / Hard difficulty: distributed consensus protocols, custom compilers/analyzers, memory-safe custom allocators, high-throughput streaming engines, zero-copy networking, and performance optimization.';

  const prompt = `You are a Principal Software Architect at Relearn.ai.
Generate exactly 10 distinct, highly realistic, production-grade project blueprints for a student enrolled in:
- Plan Title: "${sanitizeInput(plan.title)}"
- Target Technology / Language: "${targetTech}"
- Target Difficulty Tier: "${tier}" (Strict requirement: ALL 10 projects must be ${tier} level)
- Context & Focus: "${sanitizeInput(planDesc)}"
- Generation Seed: "${randomSeed}"

CRITICAL REQUIREMENTS:
1. Generate exactly 10 UNIQUE engineering projects for ${targetTech}. Avoid toy calculators or generic placeholder apps.
2. ${tierGuidance}
3. The technology MUST strictly match "${targetTech}" (e.g. for C#, use .NET 8/9, ASP.NET Core, EF Core, Spectre.Console; for Rust, use Cargo, Tokio, Clap, Crossterm; for Flutter, use Dart, widgets, sqflite, CustomPainter; etc.).
4. Return ONLY a valid JSON array matching the schema below. No conversational preambles or markdown backticks outside of JSON.

JSON SCHEMA:
[
  {
    "id": "bp-1",
    "title": "Project Title",
    "tagline": "One concise sentence describing what the learner builds.",
    "domain": "Web & APIs | CLI & Tooling | Desktop | Data & Storage | Concurrency | Security | Compilers",
    "technology": "${targetTech}",
    "difficulty": "${tier}",
    "estimatedHours": ${tier === 'Beginner' ? 2 : tier === 'Intermediate' ? 4 : 7},
    "realWorldScenario": "2 sentences explaining the exact production problem this solves in modern tech stacks.",
    "techStack": ["${targetTech}", "Framework/Library 1", "Library 2"],
    "architectureOverview": "Input / UI -> Processing Layer -> Engine -> Output",
    "keyChallenges": [
      "Concrete technical hurdle 1",
      "Concrete technical hurdle 2"
    ]
  }
]`;

  try {
    const response = await generateAI({
      task: 'learning_space',
      prompt,
      options: {
        temperature: 0.7,
        maxTokens: 3500,
      },
    });

    const parsed = safeParseAIResponse(response.text);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => {
        const title = item.title || `${targetTech} ${tier} Project ${idx + 1}`;
        const files = createTechAppropriateFiles(targetTech, title);
        const milestoneObjectives = createTechAppropriateMilestones(title, targetTech, tier);

        return {
          id: `llm-bp-${plan.id}-${tier.toLowerCase()}-${Date.now().toString(36)}-${idx + 1}`,
          title,
          tagline: item.tagline || `Build a production-grade ${tier} system using ${targetTech}.`,
          domain: item.domain || (tier === 'Beginner' ? 'CLI & Fundamentals' : tier === 'Intermediate' ? 'Data & Services' : 'Advanced Systems'),
          technology: targetTech,
          difficulty: tier,
          estimatedHours: Number(item.estimatedHours) || (tier === 'Beginner' ? 2 : tier === 'Intermediate' ? 4 : 7),
          realWorldScenario:
            item.realWorldScenario ||
            `Production software teams use ${targetTech} to implement scalable, robust systems.`,
          techStack:
            Array.isArray(item.techStack) && item.techStack.length > 0
              ? item.techStack
              : [targetTech, 'Toolchain', 'CLI', 'Testing'],
          architectureOverview: item.architectureOverview || 'Input -> Core Engine -> Output',
          keyChallenges:
            Array.isArray(item.keyChallenges) && item.keyChallenges.length > 0
              ? item.keyChallenges
              : ['Memory safety & error handling', 'Modular architecture'],
          files,
          milestoneObjectives,
        };
      });
    }
  } catch (err) {
    console.error(`Failed to generate 10 ${tier} projects via LLM:`, err);
  }

  return generateTechSpecificFallbackBlueprints(plan, targetTech, tier);
}

/**
 * Creates starter files tailored to the technology and project.
 */
function createTechAppropriateFiles(tech: string, title: string): ProjectVirtualFile[] {
  const t = tech.toLowerCase();

  if (t.includes('c#') || t.includes('csharp') || t.includes('.net')) {
    return [
      {
        id: 'f1',
        name: 'Program.cs',
        path: 'src/Program.cs',
        language: 'csharp',
        isEntrypoint: true,
        content: `// ${title}\n// Built with C# & .NET\n\nusing System;\n\nnamespace RelearnApp\n{\n    internal class Program\n    {\n        static void Main(string[] args)\n        {\n            Console.WriteLine("=== ${title} ===");\n            Console.WriteLine("Initializing C# .NET Engine...");\n        }\n    }\n}\n`,
      },
      {
        id: 'f2',
        name: 'Service.cs',
        path: 'src/Service.cs',
        language: 'csharp',
        content: `namespace RelearnApp\n{\n    public class EngineService\n    {\n        public bool ProcessTask(string input)\n        {\n            return !string.IsNullOrWhiteSpace(input);\n        }\n    }\n}\n`,
      },
      {
        id: 'f3',
        name: 'App.csproj',
        path: 'App.csproj',
        language: 'xml',
        content: `<Project Sdk="Microsoft.NET.Sdk">\n  <PropertyGroup>\n    <OutputType>Exe</OutputType>\n    <TargetFramework>net8.0</TargetFramework>\n    <Nullable>enable</Nullable>\n    <ImplicitUsings>enable</ImplicitUsings>\n  </PropertyGroup>\n</Project>\n`,
      },
      {
        id: 'f4',
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ${title}\n\nProduction-grade C# / .NET project.\n\n## Run with:\n\`dotnet build\`\n\`dotnet run\`\n\`dotnet test\`\n`,
      },
    ];
  }

  if (t.includes('rust')) {
    return [
      {
        id: 'f1',
        name: 'main.rs',
        path: 'src/main.rs',
        language: 'rust',
        isEntrypoint: true,
        content: `// ${title}\n// Built with Rust & Cargo\n\nfn main() {\n    println!("=== ${title} ===");\n    println!("Initializing Rust Systems Engine...");\n}\n`,
      },
      {
        id: 'f2',
        name: 'engine.rs',
        path: 'src/engine.rs',
        language: 'rust',
        content: `pub fn process_data(input: &[u8]) -> Result<Vec<u8>, &'static str> {\n    if input.is_empty() {\n        return Err("Input buffer cannot be empty");\n    }\n    Ok(input.to_vec())\n}\n`,
      },
      {
        id: 'f3',
        name: 'Cargo.toml',
        path: 'Cargo.toml',
        language: 'toml',
        content: `[package]\nname = "relearn_project"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n`,
      },
      {
        id: 'f4',
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ${title}\n\nBuilt with Rust.\n\n## Run with:\n\`cargo check\`\n\`cargo run\`\n\`cargo test\`\n`,
      },
    ];
  }

  if (t.includes('flutter') || t.includes('dart')) {
    return [
      {
        id: 'f1',
        name: 'main.dart',
        path: 'lib/main.dart',
        language: 'dart',
        isEntrypoint: true,
        content: `import 'package:flutter/material.dart';\n\nvoid main() => runApp(const MyApp());\n\nclass MyApp extends StatelessWidget {\n  const MyApp({super.key});\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      title: '${title}',\n      theme: ThemeData(useMaterial3: true),\n      home: const Scaffold(\n        body: Center(child: Text('${title}')),\n      ),\n    );\n  }\n}\n`,
      },
      {
        id: 'f2',
        name: 'pubspec.yaml',
        path: 'pubspec.yaml',
        language: 'yaml',
        content: `name: flutter_app\nenvironment:\n  sdk: '>=3.0.0 <4.0.0'\ndependencies:\n  flutter:\n    sdk: flutter\n`,
      },
      {
        id: 'f3',
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ${title}\n\nBuilt with Flutter & Dart.\n\n## Run with:\n\`flutter pub get\`\n\`flutter run\`\n`,
      },
    ];
  }

  // Python
  if (t.includes('python')) {
    return [
      {
        id: 'f1',
        name: 'main.py',
        path: 'main.py',
        language: 'python',
        isEntrypoint: true,
        content: `"""\n${title}\nBuilt with Python\n"""\n\ndef main():\n    print("=== ${title} ===")\n    print("Initializing Python Engine...")\n\nif __name__ == "__main__":\n    main()\n`,
      },
      {
        id: 'f2',
        name: 'requirements.txt',
        path: 'requirements.txt',
        language: 'text',
        content: `# Dependencies\npytest>=8.0.0\n`,
      },
      {
        id: 'f3',
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ${title}\n\nBuilt with Python.\n\n## Run with:\n\`python main.py\`\n\`pytest\`\n`,
      },
    ];
  }

  // Universal TypeScript
  return [
    {
      id: 'f1',
      name: 'index.ts',
      path: 'src/index.ts',
      language: 'typescript',
      isEntrypoint: true,
      content: `// ${title}\n// Built with TypeScript\n\nconsole.log("=== ${title} ===");\nexport function initEngine() {\n  return { status: "ready" };\n}\n`,
    },
    {
      id: 'f2',
      name: 'package.json',
      path: 'package.json',
      language: 'json',
      content: `{\n  "name": "relearn-project",\n  "version": "1.0.0",\n  "type": "module"\n}\n`,
    },
    {
      id: 'f3',
      name: 'README.md',
      path: 'README.md',
      language: 'markdown',
      content: `# ${title}\n\nBuilt with TypeScript.\n`,
    },
  ];
}

/**
 * Creates 3 progressive milestones tailored to the technology and tier.
 */
function createTechAppropriateMilestones(title: string, tech: string, tier: ProjectDifficultyTier) {
  return [
    {
      title: 'Milestone 1: Project Scaffolding & Setup',
      objective: `Initialize the ${tech} project structure, configure package dependencies, and establish the main entrypoint.`,
      starterHint: `Verify the project compiles without warnings using the ${tech} compiler/toolchain.`,
      criteria: [
        `Scaffold ${tech} project configuration and metadata`,
        'Implement entrypoint module and argument handling',
        'Verify zero compiler warnings'
      ]
    },
    {
      title: 'Milestone 2: Core Processing & Engine Implementation',
      objective: `Construct the primary data structures, business logic, and algorithm pipelines for ${title}.`,
      starterHint: 'Break down responsibilities into modular, decoupled functions and handle error cases.',
      criteria: [
        'Implement core data models and processing pipeline',
        'Handle runtime edge cases and invalid inputs gracefully',
        'Validate data flow across modules'
      ]
    },
    {
      title: 'Milestone 3: Verification, Edge Cases & Polish',
      objective: `Write automated unit tests verifying system correctness and error resilience.`,
      starterHint: 'Test boundary conditions, empty inputs, and failure recovery.',
      criteria: [
        'Write automated unit verification tests',
        'Pass all test assertions without errors',
        'Achieve full milestone acceptance criteria'
      ]
    }
  ];
}

/**
 * Technology- and tier-specific fallback generator.
 */
function generateTechSpecificFallbackBlueprints(
  plan: Plan,
  tech: string,
  tier: ProjectDifficultyTier
): ProjectBlueprint[] {
  const t = tech.toLowerCase();

  let curatedTitles: string[] = [];

  if (t.includes('c#') || t.includes('csharp') || t.includes('.net')) {
    if (tier === 'Beginner') {
      curatedTitles = [
        'CLI Personal Expense Tracker with Spectre.Console',
        'Minimal API Book Catalog with ASP.NET Core 8',
        'Desktop Sticky Notes App with WPF',
        'SQLite Habit Logger with Entity Framework Core',
        'Markdown to HTML Converter Tool in C#',
        'File Extension Batch Renamer Utility',
        'Console Weather API Viewer with HttpClient',
        'Simple Unit Test Runner with xUnit',
        'Password Strength & Entropy Analyzer CLI',
        'Basic In-Memory Cache with TTL & Eviction',
      ];
    } else if (tier === 'Intermediate') {
      curatedTitles = [
        'Real-Time WebSocket Chat with SignalR',
        'Blazor WebAssembly Analytics Dashboard',
        'Multi-Tenant SaaS Subscription Manager with EF Core',
        'Background Job Queue Processor with Channels',
        'Resilient HTTP Client with Polly Retry & Circuit Breakers',
        'Event-Driven Order Processing with RabbitMQ',
        'JWT Token Authentication & Role-Based Middleware',
        'MAUI Cross-Platform Inventory Management App',
        'GraphQL Catalog Service with HotChocolate',
        'CSV/Excel Streaming Importer with Zero Memory Leaks',
      ];
    } else {
      curatedTitles = [
        'High-Performance gRPC Microservice with Protobuf',
        'Custom Roslyn Code Analyzer & Refactoring Provider',
        'Distributed Cache Sync Node with Raft Consensus',
        'Zero-Allocation Buffer Pool with MemoryPool<T> and Span<T>',
        'Actor-Model Concurrency Cluster with Akka.NET',
        'Event-Sourced Financial Ledger with CQRS Architecture',
        'Custom Expression Tree Query Engine',
        'High-Throughput Network Packet Sniffer & Filter',
        'Native AOT Compiled Microservice with Sub-Millisecond Startup',
        'Distributed Lock Manager with Redis Redlock Algorithm',
      ];
    }
  } else if (t.includes('rust')) {
    if (tier === 'Beginner') {
      curatedTitles = [
        'Cargo CLI File Encryption & Stream Cipher',
        'Fast Streaming Markdown Lexer & Tokenizer',
        'Terminal Hardware Monitor with Crossterm & Sysinfo',
        'CSV Data Filter & Summary CLI Utility',
        'Interactive Terminal Quiz Game Engine',
        'Simple In-Memory Key-Value Dictionary',
        'Word Frequency Counter with HashMap',
        'UUID and Hash Generator Command-Line Tool',
        'Static File HTTP Server with std::net',
        'Basic Matrix Math & Linear Algebra Library',
      ];
    } else if (tier === 'Intermediate') {
      curatedTitles = [
        'High-Throughput In-Memory Key-Value Store with TTL',
        'Multi-Threaded HTTP/1.1 Micro-Server with Tokio',
        'Git-Compatible Content-Addressable Object Store',
        'WebAssembly Math & Physics Kernel for Browser',
        'Async WebSocket Chat Room Server',
        'Relational Query Engine with B-Tree Indexes',
        'Custom Serialization Engine (Mini Serde)',
        'DNS Resolver Client with Raw UDP Packets',
        'BitTorrent Protocol Metadata Handshake Client',
        'Thread Pool with Work-Stealing Algorithm',
      ];
    } else {
      curatedTitles = [
        'Custom 2D Game Engine with Entity Component System (ECS)',
        'Zero-Allocation Slab Memory Allocator with Unsafe Rust',
        'Raft Distributed Consensus State Machine in Rust',
        'JIT Bytecode Virtual Machine & Interpreter',
        'Lock-Free Concurrent Queue with Atomic Pointers',
        'Zero-Copy Network Proxy with eBPF and Linux Sockets',
        'Software Raytracer with SIMD Acceleration',
        'Memory-Mapped B-Tree Database Storage Engine',
        'Async Actor Framework with Tokio Channels',
        'WebAssembly JIT Runtime with Cranelift',
      ];
    }
  } else if (t.includes('flutter') || t.includes('dart')) {
    if (tier === 'Beginner') {
      curatedTitles = [
        'Daily Habit Tracker with SQLite & Provider',
        'Dynamic Theme & Material 3 Design System Showcase',
        'Simple Unit & Currency Converter with Animations',
        'Personal Recipe Notes with Local SQLite Storage',
        'Flashcards Study App with Flip Cards Animation',
        'Countdown & Pomodoro Timer with Audio Chimes',
        'Interactive Quiz App with Animated Results',
        'Tip & Bill Splitter with Custom Sliders',
        'Minimalist Weather App with OpenWeather API',
        'Simple Expense Logger with Categorized Lists',
      ];
    } else if (tier === 'Intermediate') {
      curatedTitles = [
        'Offline-First Markdown Notes with Cloud Sync',
        'Crypto & Stock Portfolio Tracker with Live SVG Charts',
        'Real-Time Collaborative Whiteboard with CustomPainter',
        'Kanban Board with Smooth Reorderable Drag-and-Drop',
        'Recipe Discovery App with Camera & OCR Scanner',
        'Audio Streaming & Podcast Player with Background Audio',
        'Multi-Platform File Manager with Desktop Layouts',
        'Interactive Geolocation Map with Live GPS Breadcrumbs',
        'E-Commerce Catalog with Shared Element Hero Animations',
        'Social Media Feed with Optimistic Likes & Infinite Scroll',
      ];
    } else {
      curatedTitles = [
        'End-to-End Encrypted Chat with WebSockets & AES',
        'Custom Video Player with Frame Scrubbing & Cache',
        'Real-Time Multiplayer Canvas Game with Custom Shaders',
        'Offline Map Tile Renderer with Vector Math',
        'Sound Synthesizer & Piano Roll with Web Audio / FFI',
        'Bluetooth LE Heart Rate & Sensor Dashboard',
        'Custom Gesture Physics Engine (Springs & Friction)',
        'Automated Document Scanner with Edge Detection',
        'P2P File Transfer over Local Wi-Fi Direct',
        'High-Performance Data Table with 100k Virtualized Rows',
      ];
    }
  } else if (t.includes('python')) {
    if (tier === 'Beginner') {
      curatedTitles = [
        'CLI Personal Expense Tracker with Rich & Click',
        'Flask Minimal REST API for Book Catalog',
        'File Word Frequency & Regex Search Tool',
        'Password Strength & Entropy Analyzer CLI',
        'SQLite Habit Logger with Peewee ORM',
        'Markdown Cheatsheet Terminal Viewer',
        'Automated Web Scraping Price Monitor with BeautifulSoup',
        'Batch Image Resizer & Watermarker Tool with Pillow',
        'Simple In-Memory Key-Value Cache with TTL',
        'Basic Unit Testing Suite with PyTest',
      ];
    } else if (tier === 'Intermediate') {
      curatedTitles = [
        'FastAPI Asynchronous Microservice with Pydantic & SQLAlchemy',
        'Real-Time WebSocket Chat Room with aiohttp',
        'Background Job Queue Processor with Celery & Redis',
        'JWT Token Authentication & RBAC Middleware in FastAPI',
        'Pandas & Plotly Live Financial Market Visualizer',
        'Redis Distributed Sliding-Window Rate Limiter',
        'Dockerized Multi-Service REST Architecture with PostgreSQL',
        'Multiprocessing File Encryption Pipeline',
        'GraphQL API Service with Strawberry & Starlette',
        'Full-Text Inverted Index Search Engine with Whoosh',
      ];
    } else {
      curatedTitles = [
        'Custom Bytecode Virtual Machine & Disassembler in Python',
        'Distributed Task Scheduler with Raft Consensus Algorithm',
        'High-Throughput Asynchronous Network Engine with uvloop',
        'Custom AST Optimizer & Static Code Analyzer',
        'Zero-Copy Shared Memory IPC Engine with mmap',
        'Real-Time Audio DSP Signal Processing with NumPy & C-FFI',
        'LSM-Tree Key-Value Storage Engine from Scratch',
        'Custom Static Type Checker & Inference Engine',
        'SIMD-Accelerated Matrix Multiplication with Cython',
        'Memory-Mapped Persistent B+ Tree Database Storage Engine',
      ];
    }
  } else {
    if (tier === 'Beginner') {
      curatedTitles = [
        `CLI Command-Line Parser & Utility for ${tech}`,
        `File System Inspector & Directory Tree for ${tech}`,
        `Simple In-Memory Key-Value Dictionary in ${tech}`,
        `Text Formatter & Word Frequency Counter in ${tech}`,
        `Basic Unit Test Runner & Assertion Suite for ${tech}`,
        `Interactive Terminal Calculator & REPL in ${tech}`,
        `CSV & JSON Data Validator Tool in ${tech}`,
        `Config File Parser (YAML/JSON) in ${tech}`,
        `Simple HTTP Echo Client & Request Inspector in ${tech}`,
        `Password Entropy & Hash Checker Tool in ${tech}`,
      ];
    } else if (tier === 'Intermediate') {
      curatedTitles = [
        `High-Throughput In-Memory Key-Value Store with TTL in ${tech}`,
        `Multi-Threaded HTTP/1.1 Micro-Server with ${tech}`,
        `Git-Compatible Content-Addressable Object Store in ${tech}`,
        `Real-Time WebSocket Message Broker in ${tech}`,
        `Background Worker Queue with Retry Mechanics in ${tech}`,
        `Relational Database Connection Pool & Query Builder in ${tech}`,
        `Custom Serialization & Deserialization Engine in ${tech}`,
        `DNS Packet Resolver Client over UDP with ${tech}`,
        `Token-Bucket Rate Limiter & Security Filter in ${tech}`,
        `Event-Driven Pub/Sub Channel Architecture in ${tech}`,
      ];
    } else {
      curatedTitles = [
        `Custom Bytecode Virtual Machine & Interpreter in ${tech}`,
        `Distributed Consensus State Machine (Raft) in ${tech}`,
        `Zero-Allocation Memory Buffer Pool & Slab Allocator in ${tech}`,
        `Lock-Free Concurrent Ring Buffer & Queue in ${tech}`,
        `High-Performance Streaming Lexer & AST Parser in ${tech}`,
        `Memory-Mapped B-Tree Persistent Storage Engine in ${tech}`,
        `Zero-Copy Network Proxy & Protocol Decoder in ${tech}`,
        `Actor-Model Concurrency Framework in ${tech}`,
        `WebAssembly Runtime & JIT Code Executor in ${tech}`,
        `SIMD-Accelerated Vector Compute Engine in ${tech}`,
      ];
    }
  }

  return curatedTitles.map((title, idx) => ({
    id: `dyn-fb-${plan.id}-${tier.toLowerCase()}-${idx + 1}`,
    title,
    tagline: `Engineer a production-grade ${tier} system in ${tech}.`,
    domain: tier === 'Beginner' ? 'CLI & Fundamentals' : tier === 'Intermediate' ? 'Data & Services' : 'Advanced Systems',
    technology: tech,
    difficulty: tier,
    estimatedHours: tier === 'Beginner' ? 2 : tier === 'Intermediate' ? 4 : 7,
    realWorldScenario: `Production software teams use ${tech} to implement scalable, robust systems.`,
    techStack: [tech, 'Toolchain', 'Testing', 'CLI'],
    architectureOverview: 'Input -> Core Processing Engine -> Output Artifact',
    keyChallenges: [
      'Handling memory allocation and lifetimes cleanly',
      'Propagating errors without crashing the process'
    ],
    files: createTechAppropriateFiles(tech, title),
    milestoneObjectives: createTechAppropriateMilestones(title, tech, tier),
  }));
}

/**
 * Transforms a chosen ProjectBlueprint into a full ProjectLab and persists it to user storage.
 */
export function synthesizeProjectFromBlueprint(
  userId: string,
  blueprint: ProjectBlueprint,
  plan: Plan
): ProjectLab {
  const labId = `lab-${blueprint.id}-${Date.now().toString(36)}`;

  const milestones: ProjectMilestone[] = blueprint.milestoneObjectives.map((m, idx) => {
    const entryFile = blueprint.files.find(f => f.isEntrypoint) || blueprint.files[0];
    return {
      id: `m${idx + 1}`,
      title: m.title,
      objective: m.objective,
      starterHint: m.starterHint,
      criteria: m.criteria,
      completedCriteria: {},
      completed: false,
      starterCode: {
        language: entryFile?.language || 'text',
        filename: entryFile?.path || entryFile?.name || 'main',
        code: entryFile?.content || '// Write your implementation here\n',
      },
    };
  });

  const lab: ProjectLab & { files?: ProjectVirtualFile[] } = {
    id: labId,
    topic: blueprint.domain || blueprint.title,
    title: blueprint.title,
    tagline: blueprint.tagline,
    difficulty: blueprint.difficulty,
    estimatedMinutes: blueprint.estimatedHours * 60,
    realWorldScenario: blueprint.realWorldScenario,
    technology: blueprint.technology,
    planId: plan.id,
    planTitle: plan.subject || plan.title,
    status: 'not_started',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    techStack: blueprint.techStack,
    architecture: {
      components: blueprint.techStack.slice(0, 3),
      dataFlow: blueprint.architectureOverview,
      keyChallenges: blueprint.keyChallenges,
    },
    milestones,
    testChecklist: [
      `Build passes with zero errors under ${blueprint.technology} toolchain`,
      'All milestone acceptance criteria satisfied',
      'AI code review score >= 80/100'
    ],
    files: blueprint.files,
  };

  return lab;
}
