'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const STRIPE_LINK = 'https://buy.stripe.com/3cI4gA05G3vidHa8XU3Ru00';

export default function PricingPage() {
  const [isPayPalLoaded, setIsPayPalLoaded] = useState(false);

  useEffect(() => {
    // Load PayPal SDK
    if (!window.paypal && !isPayPalLoaded) {
      const script = document.createElement('script');
      script.src = 'https://www.paypal.com/sdk/js?client-id=sb&currency=USD&intent=capture'; // sandbox client-id
      script.async = true;
      script.onload = () => {
        setIsPayPalLoaded(true);
      };
      document.head.appendChild(script);
    } else if (window.paypal) {
      setIsPayPalLoaded(true);
    }
  }, [isPayPalLoaded]);

  const PayPalButton = () => {
    useEffect(() => {
      if (isPayPalLoaded && window.paypal) {
        window.paypal.Buttons({
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [{
                amount: {
                  value: '1.50' // Default amount, can be customized
                },
                description: 'Oracle HCM Tables - Unlimited Access'
              }]
            });
          },
          onApprove: (data, actions) => {
            return actions.order.capture().then((details) => {
              alert('Thank you for your payment! You now have unlimited access to Oracle HCM Tables.');
              // Here you would typically redirect to a success page or update user access
              console.log('PayPal payment completed:', details);
            });
          },
          onError: (err) => {
            console.error('PayPal error:', err);
            alert('Payment failed. Please try again.');
          }
        }).render('#paypal-button-container');
      }
    }, []);

    return (
      <div id="paypal-button-container" className="mt-4"></div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white hover:text-gray-300 transition-colors">
            Oracle Cloud Tables
          </Link>
          <Link href="/search" className="text-gray-400 hover:text-white transition-colors">
            Search →
          </Link>
        </div>
      </div>

      {/* Pricing Content */}
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-16 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
          Pay What You Want
        </h1>
        <p className="text-base sm:text-xl text-gray-400 mb-8 sm:mb-12">
          Support this project and unlock unlimited access
        </p>

        {/* Main Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="mb-6">
            <p className="text-gray-400 mb-4">
              Oracle Cloud documentation can be hard to navigate. This tool makes it easy to find the tables and columns you need.
            </p>
            <p className="text-gray-500 text-sm">
              2 free lookups included. Pay any amount to unlock unlimited access.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href={STRIPE_LINK}
              className="inline-block w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-lg transition-colors"
            >
              Pay with Stripe ($1.50) →
            </a>
            
            <div className="text-gray-500 text-sm">or</div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-white font-semibold mb-2">Pay with PayPal ($1.50)</div>
              {isPayPalLoaded ? (
                <PayPalButton />
              ) : (
                <div className="bg-gray-700 rounded-lg p-4 text-center text-gray-400">
                  Loading PayPal...
                </div>
              )}
            </div>
          </div>

          <p className="text-gray-600 text-sm mt-4">
            Secure payment via Stripe or PayPal
          </p>
        </div>

        {/* What's included */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-left">
          <h3 className="font-semibold mb-4 text-center text-gray-300">What's included:</h3>
          <ul className="space-y-3">
            {[
              'Unlimited table lookups',
              'Full column documentation with data types',
              'Search across HCM, Financials, SCM, CX modules',
              'Fast, clean interface - no Oracle doc navigation',
              'Instant search across all tables and columns',
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

        {/* FAQ */}
        <div className="mt-12 text-left">
          <h2 className="text-xl font-bold text-center mb-6">Questions</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">How does "pay what you want" work?</h3>
              <p className="text-gray-400 text-sm">
                You choose the amount. Any payment unlocks unlimited access to all table documentation.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Is this affiliated with Oracle?</h3>
              <p className="text-gray-400 text-sm">
                No. This is an independent tool that organizes publicly available Oracle Cloud documentation for easier searching.
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="font-semibold mb-2">What payment methods are accepted?</h3>
              <p className="text-gray-400 text-sm">
                All major credit cards via Stripe. Apple Pay and Google Pay also supported.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>
            <Link href="/" className="text-blue-400 hover:underline">Back to Home</Link>
            {' • '}
            <Link href="/search" className="text-blue-400 hover:underline">Search Tables</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
