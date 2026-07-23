import Link from 'next/link';
import Database from 'better-sqlite3';
import path from 'path';
import LeadCaptureForm from './components/LeadCaptureForm';

function getStats() {
  try {
    const dbPath = path.join(process.cwd(), '..', 'oracle_tables.db');
    const db = new Database(dbPath, { readonly: true });
    const stats = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM tables_views WHERE type='TABLE') as tables,
        (SELECT COUNT(*) FROM tables_views WHERE type='VIEW') as views,
        (SELECT COUNT(*) FROM columns) as columns,
        (SELECT COUNT(DISTINCT module_id) FROM tables_views) as modules
    `).get();
    db.close();
    return stats;
  } catch (e) {
    return { tables: 0, views: 0, columns: 0, modules: 0 };
  }
}

export default function Home() {
  const stats = getStats();

  // Schema.org structured data for homepage
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Oracle HCM Tables Search',
    url: 'https://hcm-tables.com',
    description: 'Search 5,500+ Oracle Fusion Cloud tables and 240,000+ columns instantly',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://hcm-tables.com/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  };

  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'HCM Tables',
    url: 'https://hcm-tables.com',
    description: 'Oracle Fusion Cloud database documentation search tool',
    sameAs: []
  };

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
    />
    <main className="min-h-screen bg-gray-950">
      {/* Hero */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-3 sm:mb-4">
            Oracle Cloud Tables & Views
          </h1>
          <p className="text-base sm:text-xl text-gray-400 text-center mb-2">
            Searchable database of Oracle Fusion Cloud schema documentation
          </p>
          <p className="text-gray-500 text-center text-sm sm:text-base mb-8 sm:mb-10">
            HCM • Financials • SCM • CX Sales • Common Features
          </p>

          {/* Search */}
          <form action="/search" className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                name="q"
                placeholder="Search tables, views, or columns..."
                className="flex-1 px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-400">{stats.tables.toLocaleString()}</div>
            <div className="text-gray-400 text-sm sm:text-base">Tables</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-400">{stats.views.toLocaleString()}</div>
            <div className="text-gray-400 text-sm sm:text-base">Views</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-400">{stats.columns.toLocaleString()}</div>
            <div className="text-gray-400 text-sm sm:text-base">Columns</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-yellow-400">{stats.modules}</div>
            <div className="text-gray-400 text-sm sm:text-base">Modules</div>
          </div>
        </div>
      </div>

      {/* Why Use This */}
      <div className="max-w-6xl mx-auto px-4 pb-10 sm:pb-16">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Why use this instead of Oracle Docs?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-green-400 mb-2">✓ Instant Search</h3>
              <p className="text-gray-400">Search across all tables and columns instantly. No navigating through nested dropdowns.</p>
            </div>
            <div>
              <h3 className="font-semibold text-green-400 mb-2">✓ Column Search</h3>
              <p className="text-gray-400">Find which tables contain a specific column name. Essential for building reports and integrations.</p>
            </div>
            <div>
              <h3 className="font-semibold text-green-400 mb-2">✓ Cross-Module</h3>
              <p className="text-gray-400">Search across HCM, Financials, SCM, and more in one place.</p>
            </div>
            <div>
              <h3 className="font-semibold text-green-400 mb-2">✓ Fast & Clean</h3>
              <p className="text-gray-400">No bloated pages. Just the schema info you need.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-6xl mx-auto px-4 pb-10 sm:pb-16">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Popular Tables</h2>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {['PER_ALL_PEOPLE_F', 'PER_ALL_ASSIGNMENTS_F', 'PER_ADDRESSES_F', 'HR_LOCATIONS_ALL',
            'PAY_PAYROLL_ACTIONS', 'PAY_RUN_RESULTS_F', 'HZ_PARTIES', 'HZ_CUST_ACCOUNTS'].map(tbl => (
            <Link key={tbl} href={`/table/${tbl}`}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg font-mono text-xs sm:text-sm text-blue-400 hover:bg-gray-800 transition-colors">
              {tbl}
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Data sourced from Oracle Cloud documentation. Not affiliated with Oracle.</p>
          <p className="mt-2">
            <Link href="/pricing" className="text-blue-400 hover:underline">
              Pricing
            </Link>
            {' • '}
            <a href="https://docs.oracle.com/en/cloud/saas/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Official Oracle Docs →
            </a>
          </p>
        </div>
      </div>

      {/* Lead Capture Form */}
      <LeadCaptureForm />
    </main>
    </>
  );
}
