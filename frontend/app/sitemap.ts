import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.gps-eu.com';
  const now = new Date();

  return [
    // Main landing page with alternate language links for Googlebot
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: {
        languages: {
          fr: `${baseUrl}/?lang=fr`,
          en: `${baseUrl}/?lang=en`,
          ar: `${baseUrl}/?lang=ar`,
          'x-default': baseUrl,
        },
      },
    },
    // French version
    {
      url: `${baseUrl}/?lang=fr`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    // English version
    {
      url: `${baseUrl}/?lang=en`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    // Arabic version
    {
      url: `${baseUrl}/?lang=ar`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.95,
    },
    // Login page
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: {
        languages: {
          fr: `${baseUrl}/login?lang=fr`,
          en: `${baseUrl}/login?lang=en`,
          ar: `${baseUrl}/login?lang=ar`,
        },
      },
    },
    // Register / Demo page
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
      alternates: {
        languages: {
          fr: `${baseUrl}/register?lang=fr`,
          en: `${baseUrl}/register?lang=en`,
          ar: `${baseUrl}/register?lang=ar`,
        },
      },
    },
  ];
}
