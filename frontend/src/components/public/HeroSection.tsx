import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard } from 'lucide-react';

export const HeroSection: React.FC = () => {
  // Generate 20 lines on left and 20 lines on right
  const lineCount = 20;
  const lines = Array.from({ length: lineCount }, (_, i) => ({
    id: i,
    width: 60 + i * 10, // Widths increase from 60px by 10px
    delay: `${(i * 0.25).toFixed(2)}s`, // Staggered delay i * 0.25s
  }));

  const tickerItems = [
    'Fee Management',
    'Secure Payments',
    'Parent Portal',
    'Attendance Tracking',
    'Test Performance',
    'Smart Reminders',
  ];

  // Quadruple items to ensure seamless 30-second loop without jump
  const fullTicker = [...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems];

  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="landing-hero" id="hero">
      {/* 20 Curved Left + 20 Curved Right Line Animations */}
      <div className="hero-curved-lines-container" aria-hidden="true">
        {/* Left Side Lines */}
        <div className="curved-side curved-left">
          {lines.map((item) => (
            <div
              key={`left-${item.id}`}
              className="curved-line"
              style={{
                width: `${item.width}px`,
                animationDelay: item.delay,
              }}
            />
          ))}
        </div>

        {/* Right Side Lines */}
        <div className="curved-side curved-right">
          {lines.map((item) => (
            <div
              key={`right-${item.id}`}
              className="curved-line"
              style={{
                width: `${item.width}px`,
                animationDelay: item.delay,
              }}
            />
          ))}
        </div>

        {/* Top Horizontal Lines shown below 810px */}
        <div className="curved-top-mobile">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={`top-${i}`}
              className="curved-top-line"
              style={{
                width: `${140 + i * 30}px`,
                animationDelay: `${(i * 0.3).toFixed(2)}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Hero Center Content */}
      <div className="hero-content">
        {/* Status Chip */}
        <div className="hero-pill-badge">
          <span className="hero-pill-indicator" />
          <span>Enterprise Coaching Portal &bull; Company A, Jaipur</span>
        </div>

        {/* Main Display Headline */}
        <h1 className="hero-display-title">
          Fee management,<br />
          made <span className="font-serif-italic">effortless</span>.
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle">
          One connected platform for fee tracking, secure payments, parent updates, attendance, and academic progress.
        </p>

        {/* CTA Buttons */}
        <div className="hero-cta-group">
          <button
            onClick={scrollToFeatures}
            className="btn btn-hero-primary"
          >
            Explore the Platform
            <ArrowRight size={18} />
          </button>

          <Link
            to="/parent/login"
            className="btn btn-hero-secondary"
          >
            Parent Portal
            <CreditCard size={18} />
          </Link>
        </div>

        {/* Service Ticker Marquee */}
        <div className="hero-ticker-wrapper" aria-label="Key services marquee">
          <div className="hero-ticker-track">
            {fullTicker.map((item, idx) => (
              <span key={`ticker-${idx}`} className="ticker-item">
                <span className="ticker-dot" />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Progressive Bottom Blur */}
      <div className="progressive-bottom-blur" aria-hidden="true" />
    </section>
  );
};
