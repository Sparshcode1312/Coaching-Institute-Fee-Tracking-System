import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const PublicNavbar: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Handle body scroll locking
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => document.body.classList.remove('scroll-locked');
  }, [isDrawerOpen]);

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  const closeDrawer = () => setIsDrawerOpen(false);

  const scrollToSection = (id: string) => {
    closeDrawer();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="landing-navbar-container">
        <nav className="landing-navbar" aria-label="Main Navigation">
          {/* Product Wordmark */}
          <Link to="/" className="landing-wordmark">
            <span className="landing-wordmark-badge">C</span>
            <span>Company A <span style={{ fontWeight: 400, color: 'var(--muted)' }}>Fees</span></span>
          </Link>

          {/* Desktop Navigation Links */}
          <ul className="landing-nav-links">
            <li>
              <button onClick={() => scrollToSection('product')} className="landing-nav-link btn-ghost" style={{ cursor: 'pointer', padding: 0 }}>
                Product
              </button>
            </li>
            <li>
              <button onClick={() => scrollToSection('for-parents')} className="landing-nav-link btn-ghost" style={{ cursor: 'pointer', padding: 0 }}>
                For Parents
              </button>
            </li>
            <li>
              <button onClick={() => scrollToSection('for-institutes')} className="landing-nav-link btn-ghost" style={{ cursor: 'pointer', padding: 0 }}>
                For Institutes
              </button>
            </li>
            <li>
              <button onClick={() => scrollToSection('features')} className="landing-nav-link btn-ghost" style={{ cursor: 'pointer', padding: 0 }}>
                Features
              </button>
            </li>
            <li>
              <button onClick={() => scrollToSection('security')} className="landing-nav-link btn-ghost" style={{ cursor: 'pointer', padding: 0 }}>
                Security
              </button>
            </li>
          </ul>

          {/* Action CTAs */}
          <div className="landing-nav-actions">
            {isAuthenticated && user ? (
              <Link
                to={user.role === 'parent' ? '/parent' : '/accounts'}
                className="btn btn-primary btn-sm"
              >
                Dashboard
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link to="/parent/login" className="btn btn-secondary btn-sm">
                  Parent Login
                </Link>
                <Link to="/accounts/login" className="btn btn-primary btn-sm">
                  Staff Portal
                </Link>
              </>
            )}

            {/* Mobile / Tablet Menu Button */}
            <button
              onClick={toggleDrawer}
              className="landing-menu-pill-btn"
              aria-label="Open navigation menu"
              aria-expanded={isDrawerOpen}
            >
              <Menu size={16} />
              <span>Menu</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Fullscreen Navigation Drawer */}
      {isDrawerOpen && (
        <div className="fullscreen-drawer-overlay" role="dialog" aria-modal="true">
          <div className="drawer-top-bar">
            <Link to="/" onClick={closeDrawer} className="landing-wordmark">
              <span className="landing-wordmark-badge">C</span>
              <span>Company A</span>
            </Link>

            <button
              onClick={closeDrawer}
              className="drawer-close-btn"
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
          </div>

          <ul className="drawer-nav-list">
            <li className="drawer-nav-item">
              <button
                onClick={() => scrollToSection('product')}
                className="drawer-nav-link btn-ghost"
              >
                Product Overview
              </button>
            </li>
            <li className="drawer-nav-item">
              <button
                onClick={() => scrollToSection('for-parents')}
                className="drawer-nav-link btn-ghost"
              >
                For Parents
              </button>
            </li>
            <li className="drawer-nav-item">
              <button
                onClick={() => scrollToSection('for-institutes')}
                className="drawer-nav-link btn-ghost"
              >
                For Institutes
              </button>
            </li>
            <li className="drawer-nav-item">
              <button
                onClick={() => scrollToSection('features')}
                className="drawer-nav-link btn-ghost"
              >
                Features
              </button>
            </li>
            <li className="drawer-nav-item">
              <Link to="/parent/login" onClick={closeDrawer} className="drawer-nav-link">
                Parent Portal &rarr;
              </Link>
            </li>
            <li className="drawer-nav-item">
              <Link to="/accounts/login" onClick={closeDrawer} className="drawer-nav-link">
                Accounts Portal &rarr;
              </Link>
            </li>
          </ul>

          <div className="drawer-footer">
            <span>Company A Coaching Institute &bull; Jaipur, Rajasthan</span>
            <span>&copy; {new Date().getFullYear()} All Rights Reserved.</span>
          </div>
        </div>
      )}
    </>
  );
};
