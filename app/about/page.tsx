'use client';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <a href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Changisha
          </a>
          <a href="/" className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition font-semibold">
            Back Home
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">About Changisha</h1>
        <p className="text-xl text-slate-300">
          We're building the future of community fundraising in Kenya.
        </p>
      </section>

      {/* Mission */}
      <section className="py-16 px-6 bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Mission</h2>
          <p className="text-lg text-slate-300 leading-relaxed mb-6">
            To empower community groups, chamas, and organizations across Kenya with a modern,
            transparent fundraising platform that makes it simple to collect pledges, track
            contributions, and achieve shared goals.
          </p>
          <p className="text-lg text-slate-300 leading-relaxed">
            We believe that harambee (pulling together) should be effortless. By integrating
            M-Pesa, automating reminders, and providing real-time transparency, we remove barriers
            to community fundraising and let organizations focus on what matters: their mission.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Story</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-2 text-blue-400">The Problem</h3>
              <p className="text-slate-300">
                For decades, Kenyan chamas and community groups have relied on informal systems
                to collect pledges: WhatsApp groups, handwritten lists, and manual reminders.
                This led to confusion, lost money, and broken trust.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2 text-cyan-400">Our Solution</h3>
              <p className="text-slate-300">
                Changisha was built by engineers who grew up in Nairobi chamas. We understand
                the pain points. We created a platform that works the way communities actually
                work: transparent, SMS-first, and integrated with M-Pesa.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2 text-blue-400">Our Values</h3>
              <ul className="text-slate-300 space-y-2">
                <li>✓ <strong>Transparency:</strong> Every shilling is tracked and audited.</li>
                <li>✓ <strong>Privacy:</strong> DPA 2019 compliant. Your data is yours.</li>
                <li>✓ <strong>Simplicity:</strong> No technical knowledge required.</li>
                <li>✓ <strong>Community:</strong> Built by Kenyans, for Kenyans.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 px-6 bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Our Team</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Team Member 1 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-lg border border-slate-600 text-center">
              <div className="text-5xl mb-4">👨‍💻</div>
              <h3 className="text-lg font-bold mb-2">Engineering</h3>
              <p className="text-slate-400 text-sm">
                Full-stack engineers with 10+ years building fintech in Kenya. Previous: Pesapal, Flutterwave.
              </p>
            </div>

            {/* Team Member 2 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-lg border border-slate-600 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-lg font-bold mb-2">Product</h3>
              <p className="text-slate-400 text-sm">
                Former product lead at Kitabu Yetu. Deep expertise in community finance and chama operations.
              </p>
            </div>

            {/* Team Member 3 */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-6 rounded-lg border border-slate-600 text-center">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-lg font-bold mb-2">Community</h3>
              <p className="text-slate-400 text-sm">
                Launched in 10+ chamas across Nairobi. Gathering feedback and iterating fast.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">By The Numbers</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">2025</div>
              <div className="text-slate-400">Founded</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-400 mb-2">100+</div>
              <div className="text-slate-400">Campaigns</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">10K+</div>
              <div className="text-slate-400">Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-400 mb-2">KES 5M+</div>
              <div className="text-slate-400">Raised</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join Us?</h2>
          <p className="text-lg mb-6 text-white/90">
            Start your first campaign today and see why thousands of Kenyans trust Changisha.
          </p>
          <a
            href="/campaigns/1/pledge"
            className="inline-block bg-white text-blue-600 hover:bg-slate-100 px-8 py-3 rounded-lg font-semibold transition"
          >
            Get Started
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center text-slate-400">
          <p>&copy; {new Date().getFullYear()} Changisha. All rights reserved. Built for Kenya.</p>
        </div>
      </footer>
    </div>
  );
}
