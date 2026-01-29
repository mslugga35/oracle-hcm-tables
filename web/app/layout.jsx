import './globals.css';

export const metadata = {
  title: 'Oracle Cloud Tables & Views',
  description: 'Search Oracle HCM, Financials, SCM tables and columns instantly. Better than navigating Oracle docs.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
