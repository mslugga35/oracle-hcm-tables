import Link from 'next/link';
import Database from 'better-sqlite3';
import path from 'path';
import { notFound } from 'next/navigation';

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
  
  return (
    <main className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-400">Home</Link>
          <span>/</span>
          <Link href={`/search?q=${objectOwner}`} className="hover:text-blue-400">{table.module_name || 'HCM'}</Link>
          <span>/</span>
          <span className="text-gray-300">{table.name}</span>
        </div>
        
        {/* Header */}
        <h1 className="text-4xl font-bold font-mono text-white mb-2">{table.name}</h1>
        
        {/* Description */}
        {table.description && (
          <p className="text-lg text-gray-400 mb-6">{table.description}</p>
        )}
        
        {/* Details Card - Like Oracle */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-gray-500 text-sm">Schema</div>
              <div className="text-white">FUSION</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Object owner</div>
              <div className="text-white">{objectOwner}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Object type</div>
              <div className="text-white">{table.type}</div>
            </div>
            <div>
              <div className="text-gray-500 text-sm">Module</div>
              <div className="text-white">{table.module_name || 'Human Capital Management'}</div>
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
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-xl font-bold">Columns</h2>
            <p className="text-gray-500 text-sm">{columns.length} columns</p>
          </div>
          
          {columns.length > 0 ? (
            <div className="overflow-x-auto">
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
  );
}

export async function generateMetadata({ params }) {
  const { name } = await params;
  return {
    title: `${name} - Oracle Cloud Tables`,
    description: `Schema documentation for ${name} table in Oracle Fusion Cloud`,
  };
}
