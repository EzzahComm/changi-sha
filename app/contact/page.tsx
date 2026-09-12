'use client';

import { useState } from 'react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form submission (in production, send to your backend)
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h1 className="text-5xl md:text-6xl font-bold mb-6">Get in Touch</h1>
        <p className="text-xl text-slate-300">
          Have a question? We'd love to hear from you. Let's chat about how Changisha can help your chama.
        </p>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="text-2xl font-bold mb-8">Send us a Message</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-semibold mb-2">Your Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Kipchoge"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@example.com"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+254 712 345 678"
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Subject</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">Select a subject...</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="support">Technical Support</option>
                  <option value="feedback">Feedback & Suggestions</option>
                  <option value="press">Press Inquiry</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-2">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us how we can help..."
                  required
                  rows={5}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              {submitStatus === 'success' && (
                <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
                  ✓ Thank you! We'll get back to you soon.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                  ✗ There was an error. Please try again.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div>
            <h2 className="text-2xl font-bold mb-8">Other Ways to Reach Us</h2>

            {/* Email */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mb-6">
              <div className="text-3xl mb-3">📧</div>
              <h3 className="font-bold text-lg mb-2">Email</h3>
              <p className="text-slate-300 mb-1">General inquiries</p>
              <a href="mailto:hello@changisha.ke" className="text-blue-400 hover:text-cyan-400 transition">
                hello@changisha.ke
              </a>
              <p className="text-slate-300 mt-3 mb-1">Support</p>
              <a href="mailto:support@changisha.ke" className="text-blue-400 hover:text-cyan-400 transition">
                support@changisha.ke
              </a>
            </div>

            {/* Phone */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mb-6">
              <div className="text-3xl mb-3">📱</div>
              <h3 className="font-bold text-lg mb-2">Phone</h3>
              <p className="text-slate-300 mb-1">Nairobi Office</p>
              <a href="tel:+254712345678" className="text-blue-400 hover:text-cyan-400 transition">
                +254 712 345 678
              </a>
              <p className="text-slate-400 text-sm mt-2">
                Available Mon-Fri, 9am-5pm EAT
              </p>
            </div>

            {/* Location */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mb-6">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="font-bold text-lg mb-2">Office</h3>
              <p className="text-slate-300">
                Changisha Ltd.<br />
                Nairobi Tech Hub<br />
                Nairobi, Kenya
              </p>
            </div>

            {/* Social */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
              <div className="text-3xl mb-3">🔗</div>
              <h3 className="font-bold text-lg mb-3">Connect</h3>
              <div className="flex gap-4">
                <a href="#" className="text-slate-400 hover:text-blue-400 transition font-semibold">
                  Twitter
                </a>
                <a href="#" className="text-slate-400 hover:text-blue-400 transition font-semibold">
                  LinkedIn
                </a>
                <a href="#" className="text-slate-400 hover:text-blue-400 transition font-semibold">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-slate-800/50 border-y border-slate-700">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Quick Answers</h2>

          <div className="space-y-6">
            <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-bold mb-2">How long does it take to get a response?</h3>
              <p className="text-slate-300">
                We aim to respond within 24 hours for all inquiries. For urgent support, contact our phone line during business hours.
              </p>
            </div>

            <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-bold mb-2">Do you offer enterprise support?</h3>
              <p className="text-slate-300">
                Yes! For organizations looking for custom solutions or dedicated support, please reach out to our partnerships team.
              </p>
            </div>

            <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-bold mb-2">Are there any hidden fees?</h3>
              <p className="text-slate-300">
                Nope! We believe in transparency. You'll always know exactly what you're paying for. Check out our pricing page for details.
              </p>
            </div>

            <div className="bg-slate-700/50 p-6 rounded-lg border border-slate-600">
              <h3 className="text-lg font-bold mb-2">Can I schedule a demo?</h3>
              <p className="text-slate-300">
                Absolutely! Use the form above to request a demo, or book a time that works for you on our calendly link.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-600 to-cyan-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-6 text-white/90">
            Create your first campaign for free and see Changisha in action.
          </p>
          <a
            href="/campaigns/1/pledge"
            className="inline-block bg-white text-blue-600 hover:bg-slate-100 px-8 py-3 rounded-lg font-semibold transition"
          >
            Start Campaign
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
