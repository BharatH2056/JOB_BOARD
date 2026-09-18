import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Search,
  ArrowRight,
} from 'lucide-react';

export const Landing = () => {
  const { isAuthenticated, isEmployer } = useAuth();

  const exploreTarget = isAuthenticated ? '/jobs' : '/login';
  const postJobTarget = isAuthenticated ? (isEmployer ? '/employer/jobs/new' : '/login') : '/login';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          padding: '80px 0 60px',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '400px',
            background: 'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.15), transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '840px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              backgroundColor: 'var(--accent-muted)',
              border: '1px solid var(--border-accent)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--accent-hover)',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-semibold)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <Sparkles size={14} />
            <span>Next-Generation AI Vector Matching</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 6vw, 56px)',
              fontWeight: 'var(--weight-bold)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              marginBottom: 'var(--space-6)',
              color: 'var(--text-primary)',
            }}
          >
            AI-Powered Job Board with <span style={{ color: 'var(--accent-hover)' }}>Semantic Vector Matching</span>
          </h1>

          <p
            style={{
              fontSize: 'var(--text-lg)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-8)',
              maxWidth: '640px',
              margin: '0 auto var(--space-8)',
            }}
          >
            Connect with opportunities that align with your true technical capabilities. Powered by high-dimensional neural vector embeddings and natural language search, JobPulse matches candidates and hiring teams through deep semantic understanding.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <Link to={exploreTarget} style={{ textDecoration: 'none' }}>
              <Button size="lg" variant="primary" style={{ gap: '8px' }}>
                <Search size={18} />
                <span>Explore Opportunities</span>
                <ArrowRight size={16} />
              </Button>
            </Link>

            {(!isAuthenticated || isEmployer) && (
              <Link to={postJobTarget} style={{ textDecoration: 'none' }}>
                <Button size="lg" variant="secondary">
                  Post a Job Listing
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
