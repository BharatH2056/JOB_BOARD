import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { CheckCircle, AlertCircle, MailCheck } from 'lucide-react';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState(tokenFromUrl ? 'verifying' : 'idle'); // 'idle' | 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const executeVerification = async (tokenToUse) => {
    if (!tokenToUse) return;
    setStatus('verifying');
    setMessage('');
    try {
      const data = await verifyEmail(tokenToUse);
      setStatus('success');
      setMessage(data.message || 'Your email address has been verified successfully.');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Verification token is invalid or has expired.');
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      executeVerification(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  return (
    <div
      className="container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - var(--navbar-h) - 60px)',
        padding: '40px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-8)',
          textAlign: 'center',
        }}
      >
        {status === 'verifying' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <Spinner size={36} />
            <h3 style={{ fontSize: 'var(--text-lg)' }}>Verifying your email...</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              Please wait a moment while we confirm your credentials.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--green-bg)',
                color: 'var(--green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle size={32} />
            </div>
            <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>
              Email Verified!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
              {message}
            </p>
            <Link to="/login" style={{ textDecoration: 'none', width: '100%', marginTop: '8px' }}>
              <Button variant="primary" size="lg" style={{ width: '100%' }}>
                Sign In to Your Account
              </Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--red-bg)',
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>
              Verification Failed
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.5 }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
              <Button variant="secondary" onClick={() => setStatus('idle')} style={{ flex: 1 }}>
                Enter Token Manually
              </Button>
              <Link to="/login" style={{ textDecoration: 'none', flex: 1 }}>
                <Button variant="primary" style={{ width: '100%' }}>
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-muted)',
                color: 'var(--accent-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <MailCheck size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: '4px' }}>
                Verify Employer Account
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                Paste the verification token provided in your confirmation email or server console.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeVerification(tokenInput.trim());
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <input
                type="text"
                required
                placeholder="Paste token here..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
              <Button type="submit" variant="primary" size="lg" style={{ width: '100%' }}>
                Verify Email
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
