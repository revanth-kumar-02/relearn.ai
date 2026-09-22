export interface SEOConfig {
  siteUrl: string;
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  defaultKeywords: string;
  brandName: string;
  defaultImage: string;
  defaultImageAlt: string;
  twitterHandle?: string;
  themeColor: string;
}

export const DEFAULT_SEO_CONFIG: SEOConfig = {
  siteUrl: 'https://relearn-ai.netlify.app',
  defaultTitle: 'Relearn.ai — AI-Powered Personalized Learning Platform',
  titleTemplate: '%s | Relearn.ai',
  defaultDescription:
    'Relearn.ai is an AI-powered personalized learning platform that helps students create personalized learning plans, study interactively, practice with quizzes and flashcards, and track their learning progress.',
  defaultKeywords:
    'Relearn.ai, AI learning, personalized education, AI study plans, interactive learning, active recall, flashcards, learning tracker, skill roadmap, AI mentor for students',
  brandName: 'Relearn.ai',
  defaultImage: 'https://relearn-ai.netlify.app/logo.png',
  defaultImageAlt: 'Relearn.ai — AI-Powered Personalized Learning Platform Logo',
  themeColor: '#13a4ec'
};

export const STRUCTURED_DATA_WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': 'https://relearn-ai.netlify.app/#website',
  name: 'Relearn.ai',
  alternateName: ['Relearn AI', 'Relearn'],
  url: 'https://relearn-ai.netlify.app/',
  description:
    'Relearn.ai is an AI-powered personalized learning platform that helps students create personalized learning plans, study interactively, practice with quizzes and flashcards, and track their learning progress.',
  inLanguage: 'en-US',
  publisher: {
    '@id': 'https://relearn-ai.netlify.app/#organization'
  }
};

export const STRUCTURED_DATA_ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': 'https://relearn-ai.netlify.app/#organization',
  name: 'Relearn.ai',
  alternateName: ['Relearn AI'],
  url: 'https://relearn-ai.netlify.app/',
  logo: {
    '@type': 'ImageObject',
    url: 'https://relearn-ai.netlify.app/logo.png',
    caption: 'Relearn.ai Logo'
  },
  image: 'https://relearn-ai.netlify.app/logo.png',
  description:
    'Relearn.ai is an AI-powered personalized learning platform that helps students create personalized learning plans, study interactively, practice with quizzes and flashcards, and track their learning progress.',
  disambiguatingDescription:
    'Relearn.ai is an AI-driven personalized education and study platform for students providing custom learning paths, active recall flashcards, and interactive workspaces. It is not affiliated with zero-waste recycling, ITU initiatives, or healthcare data ventures.',
  knowsAbout: [
    'Personalized Learning',
    'AI Study Plans',
    'Active Recall',
    'Flashcards',
    'Interactive Learning Workspaces',
    'Educational Technology',
    'Progress Tracking'
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      email: 'imposterz.rev02@gmail.com',
      contactType: 'customer support'
    },
    {
      '@type': 'ContactPoint',
      email: 'imposterz.rith08@gmail.com',
      contactType: 'technical support'
    }
  ]
};
