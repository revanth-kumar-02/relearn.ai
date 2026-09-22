import { useEffect } from 'react';
import { DEFAULT_SEO_CONFIG } from '../config/seo';

export interface UseSEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  ogImageAlt?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  exactTitle?: boolean;
}

function setMetaTag(attributeName: string, attributeValue: string, content: string): HTMLMetaElement {
  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
  return element;
}

function setLinkTag(rel: string, href: string): HTMLLinkElement {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
  return element;
}

export function useSEO({
  title,
  description,
  keywords,
  canonical,
  noindex = false,
  nofollow = false,
  ogType = 'website',
  ogImage,
  ogImageAlt,
  jsonLd,
  exactTitle = false
}: UseSEOProps = {}) {
  useEffect(() => {
    // 1. Compute Document Title
    const formattedTitle = title
      ? exactTitle
        ? title
        : DEFAULT_SEO_CONFIG.titleTemplate.replace('%s', title)
      : DEFAULT_SEO_CONFIG.defaultTitle;

    const previousTitle = document.title;
    document.title = formattedTitle;

    // 2. Meta Description & Keywords
    const metaDescription = description || DEFAULT_SEO_CONFIG.defaultDescription;
    const metaKeywords = keywords || DEFAULT_SEO_CONFIG.defaultKeywords;
    setMetaTag('name', 'description', metaDescription);
    setMetaTag('name', 'keywords', metaKeywords);

    // 3. Robots Directives
    const robotsDirective = noindex
      ? nofollow
        ? 'noindex, nofollow'
        : 'noindex, follow'
      : 'index, follow';
    setMetaTag('name', 'robots', robotsDirective);

    // 4. Canonical URL
    const canonicalUrl = canonical || DEFAULT_SEO_CONFIG.siteUrl;
    setLinkTag('canonical', canonicalUrl);

    // 5. Open Graph Meta Tags
    const imageToUse = ogImage || DEFAULT_SEO_CONFIG.defaultImage;
    const imageAltToUse = ogImageAlt || DEFAULT_SEO_CONFIG.defaultImageAlt;

    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', metaDescription);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:site_name', DEFAULT_SEO_CONFIG.brandName);
    setMetaTag('property', 'og:image', imageToUse);
    setMetaTag('property', 'og:image:alt', imageAltToUse);

    // 6. Twitter / X Card Meta Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', metaDescription);
    setMetaTag('name', 'twitter:image', imageToUse);
    setMetaTag('name', 'twitter:image:alt', imageAltToUse);

    // 7. Structured Data (JSON-LD)
    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.setAttribute('type', 'application/ld+json');
      jsonLdScript.setAttribute('data-dynamic-seo', 'true');
      jsonLdScript.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdScript);
    }

    // Cleanup on unmount / navigation
    return () => {
      document.title = previousTitle;
      if (jsonLdScript && jsonLdScript.parentNode) {
        jsonLdScript.parentNode.removeChild(jsonLdScript);
      }
    };
  }, [
    title,
    description,
    keywords,
    canonical,
    noindex,
    nofollow,
    ogType,
    ogImage,
    ogImageAlt,
    jsonLd,
    exactTitle
  ]);
}
