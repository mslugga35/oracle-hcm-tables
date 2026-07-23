export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/search?'], // Allow search page but not query params to avoid duplicate content
      },
    ],
    sitemap: 'https://hcm-tables.com/sitemap.xml',
    host: 'https://hcm-tables.com',
  };
}
