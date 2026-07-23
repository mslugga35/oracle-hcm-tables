import Link from 'next/link';
import Database from 'better-sqlite3';
import path from 'path';
import { notFound } from 'next/navigation';
import TableViewGate from './TableViewGate';

function getTableData(tableName) {
  try {
    const dbPath = path.join(process.cwd(), '..', 'oracle_tables.db');
    const db = new Database(dbPath, { readonly: true });
    
    // Get table info
    const table = db.prepare(`
      SELECT t.*, m.name as module_name, m.code as module_code, c.name as category_name
      FROM tables_views t
      LEFT JOIN modules m ON t.module_id = m.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE UPPER(t.name) = UPPER(?)
    `).get(tableName);
    
    if (!table) {
      db.close();
      return null;
    }
    
    // Get columns
    const columns = db.prepare(`
      SELECT name, data_type, data_length, nullable, description, column_order
      FROM columns
      WHERE table_id = ?
      ORDER BY column_order
    `).all(table.id);
    
    db.close();
    return { table, columns };
  } catch (e) {
    console.error('DB error:', e);
    return null;
  }
}

export default async function TablePage({ params }) {
  const { name } = await params;
  const data = getTableData(name);
  
  if (!data) {
    notFound();
  }
  
  const { table, columns } = data;
  
  // Extract object owner from table name (first part before underscore usually)
  const nameParts = table.name.split('_');
  const objectOwner = nameParts[0];
  
  // Schema.org structured data for better SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${table.name} - Oracle Fusion Cloud ${table.type}`,
    description: table.description || `Documentation for ${table.name} ${table.type.toLowerCase()} in Oracle Fusion Cloud`,
    author: {
      '@type': 'Organization',
      name: 'HCM Tables',
      url: 'https://hcm-tables.com'
    },
    publisher: {
      '@type': 'Organization',
      name: 'HCM Tables'
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://hcm-tables.com/table/${table.name}`
    },
    about: {
      '@type': 'SoftwareSourceCode',
      name: table.name,
      codeRepository: 'Oracle Fusion Cloud',
      programmingLanguage: 'SQL'
    },
    keywords: `${table.name}, Oracle HCM, Oracle Fusion, ${table.module_name || 'HCM'}, database schema`
  };

  return (
    <TableViewGate tableName={table.name}>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
    <main className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 overflow-hidden">
          <Link href="/" className="hover:text-blue-400 shrink-0">Home</Link>
          <span className="shrink-0">/</span>
          <Link href={`/search?q=${objectOwner}`} className="hover:text-blue-400 shrink-0">{table.module_name || 'HCM'}</Link>
          <span className="shrink-0">/</span>
          <span className="text-gray-300 truncate">{table.name}</span>
        </div>

        {/* Header */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-mono text-white mb-2 break-all">{table.name}</h1>

        {/* Description */}
        {table.description && (
          <p className="text-base sm:text-lg text-gray-400 mb-4 sm:mb-6">{table.description}</p>
        )}
        
        {/* Details Card - Like Oracle */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <div className="text-gray-500 text-xs sm:text-sm">Schema</div>
              <div className="text-white text-sm sm:text-base">FUSION</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs sm:text-sm">Object owner</div>
              <div className="text-white text-sm sm:text-base">{objectOwner}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs sm:text-sm">Object type</div>
              <div className="text-white text-sm sm:text-base">{table.type}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs sm:text-sm">Module</div>
              <div className="text-white text-sm sm:text-base break-words">{table.module_name || 'Human Capital Management'}</div>
            </div>
          </div>
          
          {table.source_url && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <a href={table.source_url} target="_blank" rel="noopener noreferrer" 
                 className="text-blue-400 hover:underline text-sm">
                View on Oracle Docs →
              </a>
            </div>
          )}
        </div>
        
        {/* Columns Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-gray-800">
            <h2 className="text-lg sm:text-xl font-bold">Columns</h2>
            <p className="text-gray-500 text-xs sm:text-sm">{columns.length} columns</p>
          </div>

          {columns.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-300">Name</th>
                      <th className="text-left p-4 font-semibold text-gray-300">Datatype</th>
                      <th className="text-left p-4 font-semibold text-gray-300">Length</th>
                      <th className="text-center p-4 font-semibold text-gray-300">Not-null</th>
                      <th className="text-left p-4 font-semibold text-gray-300">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((col, i) => (
                      <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30">
                        <td className="p-4">
                          <span className="font-mono text-green-400">{col.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-yellow-400">{col.data_type || '-'}</span>
                        </td>
                        <td className="p-4 text-gray-300">
                          {col.data_length || '-'}
                        </td>
                        <td className="p-4 text-center">
                          {col.nullable === 'N' ? (
                            <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs">Yes</span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-400 text-sm max-w-md">
                          {col.description || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card layout */}
              <div className="md:hidden divide-y divide-gray-800">
                {columns.map((col, i) => (
                  <div key={i} className="p-3 hover:bg-gray-800/30">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-mono text-green-400 text-sm break-all">{col.name}</span>
                      {col.nullable === 'N' && (
                        <span className="px-1.5 py-0.5 bg-red-900/30 text-red-400 rounded text-[10px] shrink-0">NOT NULL</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-yellow-400">{col.data_type || '-'}</span>
                      {col.data_length && <span className="text-gray-500">({col.data_length})</span>}
                    </div>
                    {col.description && col.description !== '-' && (
                      <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">{col.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No column data available yet.</p>
              <p className="text-sm mt-2">Data may still be loading from Oracle docs.</p>
            </div>
          )}
        </div>
        
        {/* Back to search */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-blue-400 hover:underline">
            ← Back to Search
          </Link>
        </div>
      </div>
    </main>
    </TableViewGate>
  );
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  const data = getTableData(name);

  if (!data) {
    return {
      title: `${name} - Oracle Cloud Tables`,
      description: `Schema documentation for ${name} in Oracle Fusion Cloud`,
    };
  }

  const { table, columns } = data;
  const columnCount = columns.length;
  const tableType = table.type === 'VIEW' ? 'view' : 'table';
  const moduleName = table.module_name || 'Oracle Fusion Cloud';

  // Create compelling description
  const desc = table.description
    ? `${table.description.slice(0, 100)}... ${columnCount} columns documented.`
    : `Complete ${name} ${tableType} documentation with ${columnCount} columns. ${moduleName} schema reference.`;

  return {
    title: `${name} Table - ${columnCount} Columns | Oracle ${moduleName}`,
    description: desc,
    openGraph: {
      title: `${name} - Oracle Fusion ${tableType.charAt(0).toUpperCase() + tableType.slice(1)} Schema`,
      description: desc,
      url: `https://hcm-tables.com/table/${name}`,
    },
    alternates: {
      canonical: `/table/${name}`,
    },
  };
}
