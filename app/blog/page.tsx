'use client';

export default function Blog() {
  const blogPosts = [
    {
      id: 1,
      title: 'How Chamas Can Reduce Payment Collection Time by 80%',
      excerpt: 'Discover how M-Pesa integration and automated reminders transform the way chamas collect pledges...',
      date: 'Feb 15, 2025',
      author: 'Sarah Kipchoge',
      category: 'Tips & Tricks',
      readTime: '5 min read',
    },
    {
      id: 2,
      title: 'DPA 2019 Compliance: What Chamas Need to Know',
      excerpt: 'A practical guide to data privacy for community groups. Learn how Changisha helps you stay compliant...',
      date: 'Feb 8, 2025',
      author: 'James Mwangi',
      category: 'Compliance',
      readTime: '8 min read',
    },
    {
      id: 3,
      title: 'From Harambee to High-Tech: A Story of Community Fundraising',
      excerpt: 'Meet the teams in Nairobi who switched from WhatsApp groups to Changisha and never looked back...',
      date: 'Jan 30, 2025',
      author: 'Emma Ochieng',
      category: 'Stories',
      readTime: '6 min read',
    },
    {
      id: 4,
      title: 'Handling Edge Cases: What to Do When Contributions Don\'t Match Pledges',
      excerpt: 'Our exception handling system catches 99% of payment mismatches. Here\'s how it works behind the scenes...',
      date: 'Jan 22, 2025',
      author: 'Dev Team',
      category: 'Technical',
      readTime: '7 min read',
    },
  ];

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
        <h1 className="text-5xl md:text-6xl font-bold mb-6">Changisha Blog</h1>
        <p className="text-xl text-slate-300">
          Tips, stories, and insights about modern community fundraising.
        </p>
      </section>

      {/* Featured Post */}
      <section className="py-12 px-6 bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Featured Post</h2>

          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-8 rounded-lg">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1">
                <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm mb-4">
                  Featured
                </div>
                <h3 className="text-3xl font-bold mb-3">
                  How Chamas Can Reduce Payment Collection Time by 80%
                </h3>
                <p className="text-lg text-white/90 mb-4 leading-relaxed">
                  Discover how M-Pesa integration and automated reminders transform the way chamas collect pledges.
                  In our research with 50+ chamas across Nairobi, we found that teams using Changisha collected
                  pledges 80% faster and with 95% higher follow-through rates.
                </p>
                <div className="flex gap-4 text-sm text-white/80">
                  <span>By Sarah Kipchoge</span>
                  <span>•</span>
                  <span>Feb 15, 2025</span>
                  <span>•</span>
                  <span>5 min read</span>
                </div>
              </div>
              <div className="text-6xl">📊</div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Latest Articles</h2>

          <div className="space-y-6">
            {blogPosts.slice(1).map((post) => (
              <article key={post.id} className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="inline-block bg-slate-700 px-3 py-1 rounded-full text-xs mb-3">
                      {post.category}
                    </div>
                    <h3 className="text-2xl font-bold hover:text-blue-400 transition cursor-pointer mb-2">
                      {post.title}
                    </h3>
                  </div>
                </div>

                <p className="text-slate-300 mb-4">
                  {post.excerpt}
                </p>

                <div className="flex justify-between items-center">
                  <div className="flex gap-4 text-sm text-slate-400">
                    <span>By {post.author}</span>
                    <span>•</span>
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                  <a href="#" className="text-blue-400 hover:text-cyan-400 transition font-semibold">
                    Read →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-6 bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Browse by Category</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['All Posts', 'Tips & Tricks', 'Stories', 'Compliance', 'Technical'].map((category) => (
              <button
                key={category}
                className="bg-slate-700 hover:bg-blue-600 px-4 py-3 rounded-lg transition font-semibold text-center"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-slate-300 mb-6">
            Get the latest tips and updates delivered to your inbox.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-6 py-2 rounded-lg font-semibold transition">
              Subscribe
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            We respect your privacy. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Have a Story to Share?</h2>
          <p className="text-lg mb-6 text-white/90">
            We'd love to hear about your chama's journey with Changisha.
          </p>
          <a
            href="/contact"
            className="inline-block bg-white text-blue-600 hover:bg-slate-100 px-8 py-3 rounded-lg font-semibold transition"
          >
            Get in Touch
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
