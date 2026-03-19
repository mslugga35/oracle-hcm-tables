import './globals.css';

export const metadata = {
  title: {
    default: 'Oracle HCM Tables Search | 5,500+ Fusion Cloud Tables & Views',
    template: '%s | Oracle HCM Tables'
  },
  description: 'Search 5,500+ Oracle Fusion Cloud tables and 240,000+ columns instantly. Find HCM, Financials, SCM schema documentation faster than Oracle docs. Free table search tool.',
  keywords: ['Oracle HCM tables', 'Oracle Fusion tables', 'Oracle Cloud schema', 'PER_ALL_PEOPLE_F', 'Oracle database documentation', 'HCM table search'],
  authors: [{ name: 'HCM Tables' }],
  creator: 'HCM Tables',
  metadataBase: new URL('https://hcm-tables.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Oracle HCM Tables Search | Find Any Fusion Cloud Table Instantly',
    description: 'Search 5,500+ Oracle Fusion Cloud tables and 240,000+ columns. Faster than Oracle docs.',
    url: 'https://hcm-tables.com',
    siteName: 'Oracle HCM Tables',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oracle HCM Tables Search',
    description: 'Search 5,500+ Oracle Fusion Cloud tables instantly. Free tool.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Add after GSC verification
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://hcm-tables.com" />
        <script data-harbor-site="nd73gmc88mp5bne64v5dtknkt183736w" src="https://outgoing-oyster-428.convex.site/api/harbor-seo.js?siteId=nd73gmc88mp5bne64v5dtknkt183736w" async></script>
      </head>
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
