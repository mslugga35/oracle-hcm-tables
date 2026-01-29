import Link from 'next/link';
import Database from 'better-sqlite3';
import path from 'path';

function search(query, type = 'all') {
  if (!query || query.length < 2) return { tables: [], columns: [], groupedColumns: {} };
  
  try {
    const dbPath = path.join(process.cwd(), '..', 'oracle_tables.db');
    const db = new Database(dbPath, { readonly: true });
    const term = `%${query.toUpperCase()}%`;
    
    const tables = db.prepare(`
      SELECT t.id, t.name, t.type, t.description, m.name as module_name
      FROM tables_views t
      LEFT JOIN modules m ON t.module_id = m.id
      WHERE UPPER(t.name) LIKE ? 
      ORDER BY t.name
      LIMIT 50
    `).all(term);
    
    const columns = db.prepare(`
      SELECT c.name, c.data_type, c.data_length, c.nullable, c.description,
             t.name as table_name, t.type as table_type
      FROM columns c 
      JOIN tables_views t ON c.table_id = t.id
      WHERE UPPER(c.name) LIKE ?
      ORDER BY c.name, t.name
      LIMIT 100
    `).all(term);
    
    // Group columns by column name for cleaner display
    const groupedColumns = {};
    columns.forEach(col => {
      if (!groupedColumns[col.name]) {
        groupedColumns[col.name] = {
          name: col.name,
          data_type: col.data_type,
          data_length: col.data_length,
          tables: []
        };
      }
      groupedColumns[col.name].tables.push(col.table_name);
    });
    
    db.close();
    return { tables, columns, groupedColumns };
  } catch (e) {
    console.error(e);
    return { tables: [], columns: [], groupedColumns: {} };
  }
}

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const q = params?.q || '';
  const tab = params?.tab || 'all';
  const results = search(q);
  const groupedCols = Object.values(results.groupedColumns);

  return (
    <main className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400">
            Oracle Cloud Tables
          </Link>
        </div>
        
        {/* Search Box */}
        <form className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search tables or columns... (e.g., PER_ALL_PEOPLE_F, PERSON_ID)"
              className="flex-1 px-5 py-4 text-lg bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors">
              Search
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Search by table name, column name, or partial match. Better than Oracle's dropdown navigation!
          </p>
        </form>

        {q && (
          <>
            {/* Results Summary */}
            <div className="flex gap-4 mb-6 border-b border-gray-800 pb-4">
              <span className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg">
                {results.tables.length} Tables
              </span>
              <span className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg">
                {groupedCols.length} Columns ({results.columns.length} occurrences)
              </span>
            </div>

            {/* Tables Results */}
            {results.tables.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  Tables & Views
                </h2>
                <div className="grid gap-2">
                  {results.tables.map(t => (
                    <Link key={t.id} href={`/table/${t.name}`} 
                      className="flex items-center justify-between bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-colors">
                      <div>
                        <span className="font-mono text-blue-400 text-lg">{t.name}</span>
                        {t.description && (
                          <p className="text-gray-500 text-sm mt-1 line-clamp-1">{t.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">{t.module_name || 'HCM'}</span>
                        <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">{t.type}</span>
                        <span className="text-gray-600">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Columns Results */}
            {groupedCols.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Columns
                </h2>
                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="text-left p-4 font-semibold">Column Name</th>
                        <th className="text-left p-4 font-semibold">Type</th>
                        <th className="text-left p-4 font-semibold">Found In Tables</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedCols.map((col, i) => (
                        <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/50">
                          <td className="p-4 font-mono text-green-400">{col.name}</td>
                          <td className="p-4 text-yellow-400">
                            {col.data_type || '-'}
                            {col.data_length && <span className="text-gray-500">({col.data_length})</span>}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {col.tables.slice(0, 5).map((tbl, j) => (
                                <Link key={j} href={`/table/${tbl}`} 
                                  className="text-xs px-2 py-1 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 rounded">
                                  {tbl}
                                </Link>
                              ))}
                              {col.tables.length > 5 && (
                                <span className="text-xs px-2 py-1 text-gray-500">
                                  +{col.tables.length - 5} more
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {results.tables.length === 0 && groupedCols.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-xl mb-2">No results found for "{q}"</p>
                <p>Try a different search term or partial match</p>
              </div>
            )}
          </>
        )}

        {!q && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl mb-4">Enter a search term to find tables and columns</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="text-sm">Try:</span>
              <Link href="/search?q=PER_ALL_PEOPLE" className="text-blue-400 hover:underline">PER_ALL_PEOPLE</Link>
              <Link href="/search?q=PERSON_ID" className="text-blue-400 hover:underline">PERSON_ID</Link>
              <Link href="/search?q=ABSENCE" className="text-blue-400 hover:underline">ABSENCE</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
