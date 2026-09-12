'use client';

import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Changisha
          </a>
          <div className="hidden md:flex gap-8 text-sm">
            <a href="#features" className="hover:text-blue-400 transition">Features</a>
            <a href="#how-it-works" className="hover:text-blue-400 transition">How It Works</a>
            <a href="#faq" className="hover:text-blue-400 transition">FAQ</a>
            <a href="/about" className="hover:text-blue-400 transition">About</a>
            <a href="/blog" className="hover:text-blue-400 transition">Blog</a>
          </div>
          <a href="/campaigns/1/pledge" className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition font-semibold">
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Harambee{' '}
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Made Easy
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Modern fundraising platform for chamas and community groups in Kenya. Collect pledges, track contributions, and reach your goals together.
        </p>
        <div className="flex gap-4 justify-center mb-12 flex-wrap">
          <a
            href="/campaigns/1/pledge"
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-8 py-3 rounded-lg font-semibold transition transform hover:scale-105"
          >
            Start Campaign
          </a>
          <a
            href="#how-it-works"
            className="border border-slate-400 hover:border-blue-400 px-8 py-3 rounded-lg font-semibold transition"
          >
            Learn More
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 text-center mt-16 pt-8 border-t border-slate-700">
          <div>
            <div className="text-3xl font-bold text-blue-400">100+</div>
            <div className="text-slate-400">Campaigns</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-cyan-400">KES 5M+</div>
            <div className="text-slate-400">Raised</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-400">10K+</div>
            <div className="text-slate-400">Contributors</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Why Changisha?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-lg border border-slate-600 hover:border-blue-500 transition">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold mb-2">M-Pesa Ready</h3>
              <p className="text-slate-300">
                Integrated with Safaricom M-Pesa. Contributors pledge and pay directly via STK Push.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-lg border border-slate-600 hover:border-cyan-500 transition">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">Real-Time Tracking</h3>
              <p className="text-slate-300">
                See contributions live. Track progress toward your goal. Share updates with pledgers.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-lg border border-slate-600 hover:border-blue-500 transition">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-xl font-bold mb-2">SMS Reminders</h3>
              <p className="text-slate-300">
                Automatic reminders in Swahili. No chasing. Pledgers stay on track effortlessly.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-lg border border-slate-600 hover:border-cyan-500 transition">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-bold mb-2">Exception Handling</h3>
              <p className="text-slate-300">
                Smart system flags issues. Admin team resolves mismatches manually when needed.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-lg border border-slate-600 hover:border-blue-500 transition">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-bold mb-2">Privacy First</h3>
              <p className="text-slate-300">
                DPA 2019 compliant. Explicit consent. Full audit trail. Zero PII leaks.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-8 rounded-lg border border-slate-600 hover:border-cyan-500 transition">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-xl font-bold mb-2">Built for Chamas</h3>
              <p className="text-slate-300">
                Designed for group dynamics. Perfect for merry-go-rounds, harambee, and savings groups.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-lg flex-shrink-0">1</div>
              <div>
                <h3 className="text-xl font-bold mb-2">Create a Campaign</h3>
                <p className="text-slate-300">
                  Set your goal, tell your story, and choose a due date. Add beneficiary details and upload a photo.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-lg flex-shrink-0">2</div>
              <div>
                <h3 className="text-xl font-bold mb-2">Collect Pledges</h3>
                <p className="text-slate-300">
                  Share with your group. Members pledge via SMS or web form. Get consent to send reminders.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center font-bold text-lg flex-shrink-0">3</div>
              <div>
                <h3 className="text-xl font-bold mb-2">Contributors Pay via M-Pesa</h3>
                <p className="text-slate-300">
                  When pledgers are ready, they enter their phone. They get an M-Pesa prompt. They pay. Done.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-lg flex-shrink-0">4</div>
              <div>
                <h3 className="text-xl font-bold mb-2">Track & Celebrate</h3>
                <p className="text-slate-300">
                  Watch the progress bar fill. Share wins. When you reach your goal, funds settle straight to your account.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {/* FAQ 1 */}
            <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-bold mb-2">Is Changisha free?</h3>
              <p className="text-slate-300">
                Yes! Creating a campaign is free. We take a small platform fee on successful contributions. No hidden charges.
              </p>
            </div>

            {/* FAQ 2 */}
            <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-bold mb-2">How long does it take to receive funds?</h3>
              <p className="text-slate-300">
                Contributions are reconciled daily. Funds settle to your account the next business day after confirmation.
              </p>
            </div>

            {/* FAQ 3 */}
            <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-bold mb-2">What if someone pays the wrong amount?</h3>
              <p className="text-slate-300">
                Our system flags these automatically. Our team reviews and helps you resolve it. You're never stuck.
              </p>
            </div>

            {/* FAQ 4 */}
            <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-bold mb-2">Is my data safe?</h3>
              <p className="text-slate-300">
                Absolutely. We're DPA 2019 compliant. We never share your data without consent. Phone numbers are encrypted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Harambee?</h2>
          <p className="text-lg mb-8 text-white/90">
            Start your campaign today. It takes 5 minutes to set up.
          </p>
          <a
            href="/campaigns/1/pledge"
            className="inline-block bg-white text-blue-600 hover:bg-slate-100 px-8 py-3 rounded-lg font-semibold transition transform hover:scale-105"
          >
            Create Campaign Now
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4">Changisha</h3>
              <p className="text-slate-400 text-sm">
                Modern fundraising for chamas and community groups in Kenya.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition">How It Works</a></li>
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="/about" className="hover:text-white transition">About</a></li>
                <li><a href="/blog" className="hover:text-white transition">Blog</a></li>
                <li><a href="/contact" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="/privacy" className="hover:text-white transition">Privacy</a></li>
                <li><a href="/terms" className="hover:text-white transition">Terms</a></li>
                <li><a href="/security" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; {new Date().getFullYear()} Changisha. All rights reserved. Built for Kenya.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
