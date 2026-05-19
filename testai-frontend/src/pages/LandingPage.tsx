import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircleIcon,
  BoltIcon,
  CommandLineIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid';
import Navbar from '../components/layout/Navbar';

/* ─── tiny inline styles shared across sections ─── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono&display=swap');

  .landing-root {
    font-family: 'Inter', sans-serif;
    --primary: #3525cd;
    --primary-light: #4f46e5;
    --primary-container: #e2dfff;
    --on-surface: #131b2e;
    --on-surface-variant: #464555;
    --surface: #faf8ff;
    --surface-container: #eaedff;
    --surface-container-low: #f2f3ff;
    --surface-container-high: #e2e7ff;
    --outline-variant: #c7c4d8;
  }
  .landing-root h1, .landing-root h2, .landing-root h3 {
    font-family: 'Space Grotesk', sans-serif;
  }

  /* ── Hero ── */
  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    border-radius: 999px;
    background: rgba(83, 74, 183, 0.10);
    border: 1px solid rgba(83, 74, 183, 0.20);
    color: var(--primary-light);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 1.75rem;
  }
  .dot-grid {
    background-image: radial-gradient(circle at 1.5px 1.5px, rgba(83,74,183,0.15) 1.5px, transparent 0);
    background-size: 22px 22px;
  }
  .blur-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
  }
  .video-frame {
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 40px 80px rgba(53,37,205,0.18), 0 0 0 1px rgba(199,196,216,0.25);
    background: #0d0d1a;
  }
  .method-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
  }

  /* ── Stats ── */
  .stats-bar {
    background: #0f0e1a;
    padding: 6rem 0;
  }
  .stat-value {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 3.5rem;
    font-weight: 700;
    color: white;
    line-height: 1;
    margin-bottom: 0.5rem;
    transition: color 0.2s;
  }
  .stat-item:hover .stat-value { color: #a5b4fc; }
  .stat-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
  }

  /* ── Features bento ── */
  .bento-card {
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.25s ease;
  }
  .bento-card:hover { transform: translateY(-3px); box-shadow: 0 20px 60px rgba(53,37,205,0.12); }
  .bento-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── How it works ── */
  .step-num {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 14px;
  }
  .step-line {
    position: absolute;
    top: 32px;
    left: calc(50% + 40px);
    width: calc(100% - 80px);
    height: 1px;
    background: linear-gradient(90deg, rgba(83,74,183,0.3) 0%, rgba(83,74,183,0.05) 100%);
  }

  /* ── CTA ── */
  .cta-card {
    background: linear-gradient(135deg, #3525cd 0%, #4f46e5 60%, #6366f1 100%);
    border-radius: 28px;
    position: relative;
    overflow: hidden;
  }
  .cta-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1px, transparent 0);
    background-size: 24px 24px;
  }

  /* ── Footer ── */
  .footer-link:hover { color: #6366f1; }
`;

/* ─── sub-components ─── */
const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="stat-item" style={{ textAlign: 'center' }}>
    <p className="stat-value">{value}</p>
    <p className="stat-label">{label}</p>
  </div>
);
const logoMark = (
  <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
    <BoltIcon className="w-4 h-4 text-white" />
  </div>
);

const FeatureCard = ({
  icon,
  title,
  description,
  accent = false,
  dark = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: boolean;
  dark?: boolean;
}) => (
  <div
    className="bento-card"
    style={{
      background: dark ? '#0f0e1a' : accent ? 'var(--surface-container-high)' : 'white',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : accent ? 'rgba(53,37,205,0.10)' : 'rgba(199,196,216,0.4)'}`,
      padding: '2.5rem',
      height: '100%',
    }}
  >
    <div
      className="bento-icon"
      style={{
        background: dark
          ? 'rgba(255,255,255,0.06)'
          : accent
          ? 'rgba(53,37,205,0.10)'
          : 'var(--surface-container)',
        marginBottom: '1.5rem',
      }}
    >
      {icon}
    </div>
    <h3
      style={{
        fontSize: '1.2rem',
        fontWeight: 700,
        marginBottom: '0.75rem',
        color: dark ? 'white' : 'var(--on-surface)',
      }}
    >
      {title}
    </h3>
    <p
      style={{
        fontSize: '14px',
        lineHeight: 1.7,
        color: dark ? 'rgba(255,255,255,0.55)' : 'var(--on-surface-variant)',
      }}
    >
      {description}
    </p>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE (ENGLISH)
═══════════════════════════════════════════════════════════ */
const LandingPage: React.FC = () => {
  return (
    <>
      <style>{styles}</style>

      <div className="landing-root" style={{ background: 'var(--surface)', color: 'var(--on-surface)' }}>
        <Navbar isLoggedIn={false} />

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <section
          style={{
            paddingTop: '9rem',
            paddingBottom: '6rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* background orbs */}
          <div
            className="blur-orb"
            style={{ width: 520, height: 520, background: 'rgba(53,37,205,0.08)', top: -120, left: -160 }}
          />
          <div
            className="blur-orb"
            style={{ width: 380, height: 380, background: 'rgba(99,102,241,0.07)', top: 80, right: -100 }}
          />
          {/* dot grid */}
          <div
            className="dot-grid"
            style={{ position: 'absolute', inset: 0, opacity: 0.6, zIndex: 0 }}
          />

          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: '0 2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4rem',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* ── Left text ── */}
            <div style={{ flex: '0 0 44%' }}>
              <div className="hero-badge">
                <SparklesIcon style={{ width: 14, height: 14 }} />
                <span>New: AI ‑ powered predictive analysis</span>
              </div>

              <h1
                style={{
                  fontSize: 'clamp(2.6rem, 5vw, 4rem)',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  marginBottom: '1.5rem',
                  color: 'var(--on-surface)',
                }}
              >
                Automate your{' '}
                <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>API testing</span>{' '}
                with AI
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--on-surface-variant)',
                  lineHeight: 1.75,
                  maxWidth: '420px',
                  marginBottom: '2.5rem',
                }}
              >
                TestAI automates API discovery, test generation, and execution in seconds.
                Eliminate bugs before they reach production.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                <Link to="/register">
                  <button
                    style={{
                      background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '14px 28px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '15px',
                      cursor: 'pointer',
                      boxShadow: '0 8px 24px rgba(53,37,205,0.28)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    }}
                  >
                    Start free trial
                  </button>
                </Link>
                <button
                  style={{
                    background: 'var(--surface-container)',
                    color: 'var(--on-surface)',
                    border: '1px solid var(--outline-variant)',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  Explore platform
                </button>
              </div>

              {/* protocol badges */}
              <div style={{ display: 'flex', gap: '16px', opacity: 0.55 }}>
                {['RESTful', 'Integration tests', 'Fast Execution'].map((p) => (
                  <span
                    key={p}
                    style={{
                      fontFamily: 'Space Grotesk',
                      fontWeight: 700,
                      fontSize: '11px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Right video ── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="video-frame">
                {/* terminal bar */}
                <div
                  style={{
                    background: '#1a1828',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {['#ef4444', '#f59e0b', '#22c55e'].map((c) => (
                    <div
                      key={c}
                      style={{ width: 10, height: 10, borderRadius: '50%', background: c }}
                    />
                  ))}
                  <span
                    style={{
                      marginLeft: 12,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.3)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    testai-execution
                  </span>
                </div>
                <video
                  src="OIG3.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                {/* bottom stats bar */}
                <div
                  style={{
                    background: '#14122a',
                    padding: '12px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '24px' }}>
                    {[
                      { label: 'Latency', val: '12ms' },
                      { label: 'Coverage', val: '98.4%' },
                    ].map((d) => (
                      <div key={d.label}>
                        <p
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.35)',
                            marginBottom: 2,
                          }}
                        >
                          {d.label}
                        </p>
                        <p
                          style={{
                            fontFamily: 'Space Grotesk',
                            fontWeight: 700,
                            color: '#a5b4fc',
                            fontSize: 14,
                          }}
                        >
                          {d.val}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(83,74,183,0.15)',
                      border: '1px solid rgba(83,74,183,0.3)',
                      borderRadius: 999,
                      padding: '4px 10px',
                    }}
                  >
                    <CheckCircleIcon style={{ width: 12, height: 12, color: '#818cf8' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', letterSpacing: '0.07em' }}>
                      AI VERIFIED
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            STATS
        ══════════════════════════════════════ */}
        <section className="stats-bar">
          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: '0 2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '3rem',
              textAlign: 'center',
            }}
          >
            <StatItem value="95%" label="Reduced QA time" />
            <StatItem value="10M+" label="Tests executed monthly" />
            <StatItem value="24/7" label="Intelligent monitoring" />
          </div>
        </section>


        {/* ══════════════════════════════════════
            FEATURES BENTO
        ══════════════════════════════════════ */}
        <section style={{ padding: '7rem 0', background: 'var(--surface-container-low)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ marginBottom: '4rem' }}>
              <h2
                style={{
                  fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  marginBottom: '1rem',
                  color: 'var(--on-surface)',
                }}
              >
                Built for modern{' '}
                <span style={{ color: 'var(--primary)' }}>engineering teams</span>
              </h2>
              <p
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--on-surface-variant)',
                  maxWidth: '540px',
                  lineHeight: 1.7,
                }}
              >
                Powerful tools to ensure your API stays performant and secure at every release.
              </p>
            </div>

            {/* bento grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gridTemplateRows: 'auto auto',
                gap: '16px',
              }}
            >
              {/* large left */}
              <div style={{ gridColumn: 'span 8' }}>
                <div
                  className="bento-card"
                  style={{
                    background: 'white',
                    border: '1px solid rgba(199,196,216,0.4)',
                    padding: '2.75rem',
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ maxWidth: '480px' }}>
                    <div
                      className="bento-icon"
                      style={{ background: 'var(--primary-container)', marginBottom: '1.5rem' }}
                    >
                      <BoltIcon style={{ width: 22, height: 22, color: 'var(--primary)' }} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--on-surface)' }}>
                      Instant test generation
                    </h3>
                    <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>
                      Import your Swagger and let AI generate exhaustive test suites. Zero configuration,
                      maximum coverage on the first run.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { label: 'GET', bg: '#dae2fd', color: '#3a485c' },
                        { label: 'POST', bg: '#e2dfff', color: '#3323cc' },
                        { label: 'PUT', bg: '#eaedff', color: '#464555' },
                        { label: 'DELETE', bg: '#ffdad6', color: '#93000a' },
                      ].map((m) => (
                        <span
                          key={m.label}
                          className="method-badge"
                          style={{ background: m.bg, color: m.color }}
                        >
                          {m.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* decorative code snippet */}
                  <div
                    style={{
                      position: 'absolute',
                      right: -20,
                      bottom: -20,
                      background: '#0f0e1a',
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 11,
                      color: '#a5b4fc',
                      opacity: 0.18,
                      transform: 'rotate(6deg)',
                      width: 220,
                    }}
                  >
                    {`agent.generate(coverage="max")\n→ 142 tests ready`}
                  </div>
                </div>
              </div>

              {/* small right */}
              <div style={{ gridColumn: 'span 4' }}>
                <FeatureCard
                  icon={<CheckCircleIcon style={{ width: 22, height: 22, color: '#16a34a' }} />}
                  title="Zero false positives"
                  description="Semantic analysis validates business responses, not just HTTP status codes."
                />
              </div>

              {/* small left */}
              <div style={{ gridColumn: 'span 4' }}>
                <FeatureCard
                  icon={<ShieldCheckIcon style={{ width: 22, height: 22, color: '#7c3aed' }} />}
                  title="Vulnerability probing"
                  description="Automatically test SQL injection, JWT exploits, and broken access control on every CI/CD commit."
                  accent
                />
              </div>

              {/* large right dark */}
              <div style={{ gridColumn: 'span 8' }}>
                <div
                  className="bento-card"
                  style={{
                    background: '#0f0e1a',
                    border: '1px solid rgba(255,255,255,0.07)',
                    padding: '2.75rem',
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div
                      className="bento-icon"
                      style={{ background: 'rgba(255,255,255,0.06)', marginBottom: '1.5rem' }}
                    >
                      <CommandLineIcon style={{ width: 22, height: 22, color: '#a5b4fc' }} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'white' }}>
                      CI/CD integration & analytics
                    </h3>
                    <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.5)', marginBottom: '1.75rem', maxWidth: 440 }}>
                      A robust CLI for Jenkins and GitHub Actions. Performance dashboards to track API stability over time.
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {['user_id: uuid_v4()', 'timestamp: iso_8601()', 'payload: dynamic_mock()'].map((t) => (
                        <div
                          key={t}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 11,
                            color: '#a5b4fc',
                          }}
                        >
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      width: '35%',
                      height: '100%',
                      background: 'linear-gradient(to left, rgba(83,74,183,0.18), transparent)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════ */}
        <section style={{ padding: '7rem 0', background: 'var(--surface)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
              <h2
                style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  marginBottom: '1rem',
                  color: 'var(--on-surface)',
                }}
              >
                Workflow orchestration
              </h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--on-surface-variant)' }}>
                From ingestion to insight in three precise steps.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3rem', position: 'relative' }}>
              {[
                {
                  num: '01',
                  title: 'Connect Specs',
                  desc: "Import your OpenAPI, Swagger, or GraphQL schemas. TestAI instantly maps your entire infrastructure.",
                  active: false,
                },
                {
                  num: '02',
                  title: 'Train & Trigger',
                  desc: "Our AI learns your business constraints. Trigger on every PR or run manual probes on demand.",
                  active: true,
                },
                {
                  num: '03',
                  title: 'Resolve & Deploy',
                  desc: "Get actionable bug reports with exact reproduction steps. Patch and ship with confidence.",
                  active: false,
                },
              ].map((step) => (
                <div key={step.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem' }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: step.active ? 'var(--primary)' : 'white',
                      border: step.active ? 'none' : '1px solid var(--outline-variant)',
                      boxShadow: step.active ? '0 8px 24px rgba(53,37,205,0.30)' : '0 4px 16px rgba(0,0,0,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="step-num"
                      style={{ color: step.active ? 'white' : 'var(--primary)' }}
                    >
                      {step.num}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--on-surface)' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--on-surface-variant)' }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            CALL TO ACTION
        ══════════════════════════════════════ */}
        <section style={{ padding: '7rem 0', background: 'var(--surface-container-low)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div className="cta-card" style={{ padding: '5rem 4rem', textAlign: 'center' }}>
              <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px', margin: '0 auto' }}>
                <h2
                  style={{
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    fontWeight: 700,
                    color: 'white',
                    letterSpacing: '-0.02em',
                    marginBottom: '1.25rem',
                  }}
                >
                  Stop testing manually.
                </h2>
                <p
                  style={{
                    fontSize: '1.1rem',
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.75,
                    marginBottom: '2.5rem',
                  }}
                >
                  Join the future of API testing. No credit card required to get started.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link to="/register">
                    <button
                      style={{
                        background: 'white',
                        color: 'var(--primary)',
                        border: 'none',
                        padding: '15px 32px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '15px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    >
                      Create free account
                    </button>
                  </Link>
                 
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FOOTER
        ══════════════════════════════════════ */}
        <footer
          style={{
            background: 'white',
            borderTop: '1px solid rgba(199,196,216,0.4)',
            padding: '5rem 0 3rem',
          }}
        >
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            {/* logo + tagline */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: '1rem' }}>
                {logoMark}
                <span
                  style={{
                    fontFamily: 'Space Grotesk',
                    fontWeight: 800,
                    fontSize: '1.5rem',
                    letterSpacing: '-0.02em',
                    color: 'var(--on-surface)',
                  }}
                >
                  TestAI
                </span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--on-surface-variant)', maxWidth: 340, margin: '0 auto 2rem' }}>
                Making APIs safer, one test at a time.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem' }}>
                {['Twitter', 'Github', 'Docs', 'Changelog', 'Status', 'Privacy'].map((link) => (
                  <a
                    key={link}
                    href="#"
                    className="footer-link"
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--on-surface-variant)',
                      textDecoration: 'none',
                      transition: 'color 0.15s',
                    }}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
            <div
              style={{
                borderTop: '1px solid rgba(199,196,216,0.4)',
                paddingTop: '2rem',
                textAlign: 'center',
                fontSize: '12px',
                color: 'rgba(70,69,85,0.5)',
                letterSpacing: '0.05em',
              }}
            >
              © 2024 TestAI Platform. Precision Engineered.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;