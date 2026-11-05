import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.gps-eu.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/login',
          '/register',
          '/?lang=fr',
          '/?lang=en',
          '/?lang=ar',
        ],
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
          '/_next/',
          '/private/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/login',
          '/register',
          '/?lang=fr',
          '/?lang=en',
          '/?lang=ar',
        ],
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
