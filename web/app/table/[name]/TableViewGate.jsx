'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const FREE_VIEWS = 2;
const STORAGE_KEY = 'oracle_tables_views';
const STRIPE_LINK = 'https://buy.stripe.com/3cI4gA05G3vidHa8XU3Ru00';

export default function TableViewGate({ children, tableName }) {
  const [canView, setCanView] = useState(null);
  const [viewsUsed, setViewsUsed] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let viewData = stored ? JSON.parse(stored) : { views: [], count: 0 };
    
    const alreadyViewed = viewData.views.includes(tableName);
    
    if (alreadyViewed) {
      setCanView(true);
      setViewsUsed(viewData.count);
    } else if (viewData.count < FREE_VIEWS) {
      viewData.views.push(tableName);
      viewData.count = viewData.views.length;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewData));
      setCanView(true);
      setViewsUsed(viewData.count);
    } else {
      setCanView(false);
      setViewsUsed(viewData.count);
    }
  }, [tableName]);

  if (canView === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // Paywall - Pay What You Want style
  if (!canView) {
    return (
      <main className="min-h-screen bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          {/* Lock Icon */}
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-4">You've used your 2 free lookups</h1>
          
          <p className="text-gray-400 text-lg mb-8">
            Support this project to unlock unlimited access to all Oracle Cloud table documentation.
          </p>

          {/* Pay What You Want Box */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 mb-8">
            <h2 className="text-xl font-semibold mb-2">Pay What You Want</h2>
            <p className="text-gray-500 mb-6">
              Choose an amount that feels right. Any contribution unlocks full access.
            </p>

            <a
              href={STRIPE_LINK}
              className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-lg transition-colors"
            >
              Unlock Full Access →
            </a>
          </div>

          {/* What you get */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-left">
            <h3 className="font-semibold mb-4 text-center text-gray-300">What you'll get:</h3>
            <ul className="space-y-3">
              {[
                'Unlimited table lookups',
                'Full column documentation',
                'Search across all Oracle Cloud modules',
                'Fast, clean interface',
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-400">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Back link */}
          <div className="mt-8">
            <Link href="/" className="text-gray-500 hover:text-gray-300">
              ← Back to search
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Show remaining views banner
  return (
    <>
      {viewsUsed > 0 && viewsUsed <= FREE_VIEWS && (
        <div className="bg-gray-900 border-b border-gray-800 py-2 px-4 text-center text-sm">
          <span className="text-gray-400">
            {FREE_VIEWS - viewsUsed === 0 
              ? "This is your last free lookup. " 
              : `${FREE_VIEWS - viewsUsed} free lookup${FREE_VIEWS - viewsUsed === 1 ? '' : 's'} remaining. `}
          </span>
          <a href={STRIPE_LINK} className="text-blue-400 hover:underline">
            Unlock unlimited access
          </a>
        </div>
      )}
      {children}
    </>
  );
}
