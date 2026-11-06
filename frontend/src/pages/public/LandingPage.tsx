import React from 'react';
import { Link } from 'react-router-dom';
import { PublicNavbar } from '../../components/public/PublicNavbar.js';
import { HeroSection } from '../../components/public/HeroSection.js';
import '../../styles/landing.css';
import {
  FileText,
  Calendar,
  CreditCard,
  Smartphone,
  Bell,
  RefreshCcw,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  FileSpreadsheet,
  AlertCircle,
  TrendingDown,
  ShieldCheck,
  Lock,
  ArrowRight,
  Clock,
  Layers,
  Database,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const capabilities = [
    'Fee Management',
    'Parent Communication',
    'Payment Verification',
    'Academic Tracking',
    'Financial Reporting',
    'Attendance Records',
    'Statutory Refunds',
    'Tally ERP Integration',
    'Explainable AI Risk Scoring',
  ];

  const features = [
    {
      icon: <FileText size={22} />,
      title: 'Student Fee Ledger',
      desc: 'Authoritative double-entry ledger tracking gross fees, authorized discounts, paid amounts, and real-time net balances in integer paise.',
    },
    {
      icon: <Calendar size={22} />,
      title: 'Instalment Tracking',
      desc: 'Configurable 3-milestone and 4-milestone schedules with automated due dates, grace periods, and precise overdue day counters.',
    },
    {
      icon: <CreditCard size={22} />,
      title: 'Secure Online Payments',
      desc: 'Pluggable gateway supporting UPI QR, Netbanking, and Cards with cryptographic HMAC-SHA256 signature verification.',
    },
    {
      icon: <Smartphone size={22} />,
      title: 'Parent Portal',
      desc: 'Mobile-first portal designed around the five-second rule for instant balance clarity, payment checkout, and bilingual access.',
    },
    {
      icon: <Bell size={22} />,
      title: 'Automatic Reminders',
      desc: 'Configurable multi-stage reminder daemon (T-7, T-3, T-0, T+3, T+7) in Hindi and English, automatically cancelled upon settlement.',
    },
    {
      icon: <RefreshCcw size={22} />,
      title: 'Refund Calculator',
      desc: 'Versioned statutory refund policy (POLICY-V1-2026) with itemized registration and kit fee deductions and 10-day deadline tracking.',
    },
    {
      icon: <CheckCircle2 size={22} />,
      title: 'Attendance Management',
      desc: 'Daily lecture-wise attendance records with bulk CSV ingestion, duplicate protection, and guardian visibility.',
    },
    {
      icon: <GraduationCap size={22} />,
      title: 'Test Performance',
      desc: 'Subject-wise marks, institute rank percentiles, and academic trends replacing disorganized manual WhatsApp PDF sharing.',
    },
    {
      icon: <LayoutDashboard size={22} />,
      title: 'Accounts Command Centre',
      desc: 'Real-time executive KPIs for total billed, collected, outstanding, and critical overdue fees filtered across Jaipur centres.',
    },
    {
      icon: <FileSpreadsheet size={22} />,
      title: 'Tally ERP Export',
      desc: 'Single-click generation of balanced double-entry Tally XML vouchers and CSV reconciliation files with zero variance.',
    },
    {
      icon: <AlertCircle size={22} />,
      title: 'Unmatched Payment Queue',
      desc: 'Dedicated reconciliation workspace for direct NEFT/IMPS bank deposits awaiting student attribution.',
    },
    {
      icon: <TrendingDown size={22} />,
      title: 'Dropout Risk Alerts',
      desc: 'Explainable heuristic risk scoring across financial and academic dimensions, triggering human counsellor review tasks.',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Student & Plan Setup',
      desc: 'Admissions team enrols students into JEE/NEET batches and assigns 3 or 4-instalment fee plans.',
    },
    {
      num: '02',
      title: 'Milestone Schedules',
      desc: 'Fee engine generates dated milestone instalments with localized due dates and grace periods.',
    },
    {
      num: '03',
      title: 'Proactive Reminders',
      desc: 'Background daemon evaluates upcoming dues and dispatches multilingual WhatsApp and SMS alerts.',
    },
    {
      num: '04',
      title: 'Frictionless Payment',
      desc: 'Parents view authoritative dues on mobile and complete instant partial or full payments via UPI.',
    },
    {
      num: '05',
      title: 'Cryptographic Verification',
      desc: 'Backend verifies gateway signatures, allocates payments to oldest dues, and issues sequential receipts.',
    },
    {
      num: '06',
      title: 'Accounting & Tally Sync',
      desc: 'Accounts team monitors real-time ageing buckets and exports balanced vouchers to Tally ERP.',
    },
  ];

  return (
    <div className="landing-page-root">
      {/* 1. Fixed Header Navbar */}
      <PublicNavbar />

      {/* 2. Hero Section */}
      <HeroSection />

      {/* 3. Section 1: Problem vs Solution */}
      <section className="landing-section" id="product">
        <div className="section-header">
          <span className="section-pill-tag">The Problem & Solution</span>
          <h2 className="section-title">
            Replacing fragmented spreadsheets with financial certainty.
          </h2>
          <p className="section-description">
            Company A operates 4 centres and 2,600 students across Jaipur. We eliminated legacy desktop software and disconnected Excel sheets.
          </p>
        </div>

        <div className="problems-grid">
          <div className="problem-card">
            <div className="problem-icon-wrap">
              <Layers size={24} />
            </div>
            <h3 className="card-title">Centralized Financial Ledger</h3>
            <p className="card-subtitle">
              Previously, fee records were maintained in desktop software while due dates sat in separate spreadsheets. Our unified PostgreSQL database enforces strict double-entry ledger rules.
            </p>
          </div>

          <div className="problem-card">
            <div className="problem-icon-wrap">
              <Clock size={24} />
            </div>
            <h3 className="card-title">Zero Guesswork for Parents</h3>
            <p className="card-subtitle">
              Parents no longer have to call branch offices to know their balance. The portal presents the exact amount due, deadline, and a 1-click payment option within 5 seconds.
            </p>
          </div>

          <div className="problem-card">
            <div className="problem-icon-wrap">
              <RefreshCcw size={24} />
            </div>
            <h3 className="card-title">Automated Reconciliation & Refunds</h3>
            <p className="card-subtitle">
              Say goodbye to manual refund calculations and messy bank matching. Our policy engine itemizes statutory deductions and prepares balanced Tally XML voucher exports.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Section 2: Features Grid */}
      <section className="landing-section" id="features">
        <div className="section-header">
          <span className="section-pill-tag">Enterprise Capabilities</span>
          <h2 className="section-title">
            Engineered for high-volume institute administration.
          </h2>
          <p className="section-description">
            12 production-grade modules designed to handle ₹30–34 crore in annual collections with zero floating-point math drift.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feat, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon-badge">{feat.icon}</div>
              <h3 className="feature-card-title">{feat.title}</h3>
              <p className="feature-card-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Section 3: Parent Experience Showcase */}
      <section className="landing-section" id="for-parents">
        <div className="showcase-container">
          <div className="showcase-left">
            <span className="section-pill-tag" style={{ width: 'fit-content' }}>Parent Experience</span>
            <h2 className="section-title" style={{ textAlign: 'left' }}>
              The 5-Second Rule: Absolute fee transparency on mobile.
            </h2>
            <p className="section-description" style={{ textAlign: 'left' }}>
              Parents view their child's name, active milestone, exact outstanding balance, and immediate payment button upon login—no complex menus or confusion.
            </p>
            <ul className="showcase-feature-list">
              <li className="showcase-feature-item">
                <CheckCircle2 size={18} color="var(--green)" />
                <span>Instant Phone OTP login without cumbersome passwords</span>
              </li>
              <li className="showcase-feature-item">
                <CheckCircle2 size={18} color="var(--green)" />
                <span>Partial and full instalment payments via UPI and Netbanking</span>
              </li>
              <li className="showcase-feature-item">
                <CheckCircle2 size={18} color="var(--green)" />
                <span>Downloadable sequential receipts with SHA-256 verification hashes</span>
              </li>
              <li className="showcase-feature-item">
                <CheckCircle2 size={18} color="var(--green)" />
                <span>Bilingual interface supporting English and हिन्दी</span>
              </li>
            </ul>
            <div style={{ marginTop: '12px' }}>
              <Link to="/parent/login" className="btn btn-primary">
                Open Parent Portal
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="showcase-right">
            {/* Realistic Parent Portal Mock View */}
            <div style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.2rem' }}>Ishita Sharma</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>STU-0587 &bull; JEE 2027 Evening</span>
                </div>
                <span className="badge badge-overdue">26 Days Overdue</span>
              </div>
            </div>

            <div style={{ background: 'var(--surface-soft)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Outstanding Balance</span>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>
                ₹1,05,000 <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--muted)' }}>of ₹1,20,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Milestone 1: ₹15,000 Overdue</span>
                <span style={{ color: 'var(--muted)' }}>Due: 10 Oct 2026</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Link to="/parent/login" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                Pay Milestone ₹15,000
              </Link>
              <Link to="/parent/login" className="btn btn-secondary btn-sm">
                View Receipts
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section 4: Accounts Experience Showcase */}
      <section className="landing-section" id="for-institutes">
        <div className="showcase-container" style={{ background: '#ffffff', border: '1px solid var(--border-soft)' }}>
          <div className="showcase-right" style={{ background: 'var(--surface-soft)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-soft)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>TOTAL BILLED</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '4px' }}>₹3.60 Cr</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Across 4 Centres</span>
              </div>
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-soft)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>COLLECTED</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }}>₹45,00,000</div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Reconciled in bank</span>
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-soft)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>AGEING ANALYSIS</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <span>Current (Not Due)</span>
                <span style={{ fontWeight: 600 }}>₹3.00 Cr</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', color: 'var(--danger)' }}>
                <span>16–30 Days Overdue</span>
                <span style={{ fontWeight: 600 }}>₹15,000</span>
              </div>
            </div>
          </div>

          <div className="showcase-left">
            <span className="section-pill-tag" style={{ width: 'fit-content' }}>Institute Administration</span>
            <h2 className="section-title" style={{ textAlign: 'left' }}>
              Executive intelligence for accounts and branch leadership.
            </h2>
            <p className="section-description" style={{ textAlign: 'left' }}>
              Centrally monitor collections, overdue ageing buckets, and unmatched direct deposits across JLN Marg, Tonk Road, Vaishali Nagar, and Vidhyadhar Nagar.
            </p>
            <ul className="showcase-feature-list">
              <li className="showcase-feature-item">
                <CheckCircle2 size={18} color="var(--green)" />
                <span>Single-click Tally ERP double-entry balanced XML export</span>
              </li>
              <li className="showcase-feature-item">
                <CheckCircle2 size={18} color="var(--green)" />
                <span>Centre-scoped access control ensuring data isolation per branch</span>
              </li>
              <li className="showcase-feature-item">
                <CheckCircle2 size={18} color="var(--green)" />
                <span>Unmatched payment queue to easily reconcile offline deposits</span>
              </li>
              <li className="showcase-feature-item">
                <CheckCircle2 size={18} color="var(--green)" />
                <span>Automated statutory refund tracking with 10-day deadline alerts</span>
              </li>
            </ul>
            <div style={{ marginTop: '12px' }}>
              <Link to="/accounts/login" className="btn btn-primary">
                Access Accounts Portal
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section 5: How It Works */}
      <section className="landing-section">
        <div className="section-header">
          <span className="section-pill-tag">Lifecycle</span>
          <h2 className="section-title">
            How the platform operates end-to-end.
          </h2>
          <p className="section-description">
            From initial admission and fee milestone assignment to final settlement and accounting reconciliation.
          </p>
        </div>

        <div className="timeline-container">
          {steps.map((st, i) => (
            <div key={i} className="timeline-step-card">
              <span className="timeline-step-number">{st.num}</span>
              <h3 className="card-title">{st.title}</h3>
              <p className="card-subtitle">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Section 6: Trust & Security */}
      <section className="landing-section" id="security">
        <div className="section-header">
          <span className="section-pill-tag">Security & Compliance</span>
          <h2 className="section-title">
            Enterprise integrity at every layer.
          </h2>
          <p className="section-description">
            Engineered with strict Row-Level Security, cryptographic payment verification, and audit trail immutability.
          </p>
        </div>

        <div className="problems-grid">
          <div className="problem-card">
            <div className="problem-icon-wrap">
              <Lock size={24} />
            </div>
            <h3 className="card-title">Cryptographic Payment Verification</h3>
            <p className="card-subtitle">
              Every payment verification enforces timing-safe constant-time HMAC-SHA256 signature validation to defeat tampering and timing attacks.
            </p>
          </div>

          <div className="problem-card">
            <div className="problem-icon-wrap">
              <ShieldCheck size={24} />
            </div>
            <h3 className="card-title">Row-Level Security (RLS)</h3>
            <p className="card-subtitle">
              PostgreSQL database policies guarantee parents only read their verified linked children. Unauthorized student lookups are rejected by the engine.
            </p>
          </div>

          <div className="problem-card">
            <div className="problem-icon-wrap">
              <Database size={24} />
            </div>
            <h3 className="card-title">Redacted Structured Audit Trail</h3>
            <p className="card-subtitle">
              Every administrative override, refund approval, and fee adjustment is logged with actor metadata, while OTPs and passwords are automatically redacted.
            </p>
          </div>
        </div>
      </section>

      {/* 9. Section 7: Capability Marquee */}
      <section className="capability-marquee-section" aria-label="Capabilities marquee">
        <div className="capability-marquee-track">
          {[...capabilities, ...capabilities, ...capabilities].map((cap, i) => (
            <span key={i} className="capability-chip">
              <CheckCircle2 size={16} color="var(--green)" />
              <span>{cap}</span>
            </span>
          ))}
        </div>
      </section>

      {/* 10. Section 8: Final CTA */}
      <section className="final-cta-section">
        <h2 className="final-cta-title">
          Bring clarity to every fee transaction.
        </h2>
        <p className="final-cta-subtitle">
          Experience the modern Coaching Institute Fee Tracking System designed for Company A, Jaipur.
        </p>
        <div className="final-cta-buttons">
          <Link to="/parent/login" className="btn btn-cta-light">
            Open Parent Portal
            <ArrowRight size={18} />
          </Link>
          <Link to="/accounts/login" className="btn btn-cta-outline">
            Accounts Staff Login
          </Link>
        </div>
      </section>

      {/* 11. Section 9: Footer */}
      <footer className="landing-footer">
        <div className="footer-top">
          <div className="footer-col" style={{ maxWidth: '320px' }}>
            <div className="landing-wordmark" style={{ marginBottom: '8px' }}>
              <span className="landing-wordmark-badge">C</span>
              <span>Company A <span style={{ fontWeight: 400, color: 'var(--muted)' }}>Fees</span></span>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              Centralized fee tracking, multi-milestone payments, automated reminders, and parent portal for 4 centres across Jaipur.
            </p>
          </div>

          <div className="footer-col">
            <span className="footer-col-title">Portals</span>
            <Link to="/parent/login" className="footer-link">Parent Portal Login</Link>
            <Link to="/accounts/login" className="footer-link">Accounts Executive Portal</Link>
            <Link to="/parent" className="footer-link">Student Fee Overview</Link>
          </div>

          <div className="footer-col">
            <span className="footer-col-title">Modules</span>
            <a href="#features" className="footer-link">Fee Ledger & Instalments</a>
            <a href="#features" className="footer-link">Dues Ageing Reports</a>
            <a href="#features" className="footer-link">Tally ERP Export</a>
            <a href="#features" className="footer-link">Statutory Refund Engine</a>
          </div>

          <div className="footer-col">
            <span className="footer-col-title">Jaipur Centres</span>
            <span className="footer-link">Centre 1 — JLN Marg</span>
            <span className="footer-link">Centre 2 — Tonk Road</span>
            <span className="footer-link">Centre 3 — Vaishali Nagar</span>
            <span className="footer-link">Centre 4 — Vidhyadhar Nagar</span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {currentYear} Company A Coaching Institute, Jaipur. All rights reserved.</span>
          <span style={{ color: 'var(--muted)' }}>Precision Integer Paise Financial Architecture</span>
        </div>
      </footer>
    </div>
  );
};
