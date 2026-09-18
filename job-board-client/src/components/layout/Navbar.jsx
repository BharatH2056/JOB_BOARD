import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/Button';
import {
  Briefcase,
  Bookmark,
  FileText,
  User,
  LogOut,
  LayoutDashboard,
  Shield,
  PlusCircle,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

const ThemeToggle = ({ style = {} }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '3px',
        gap: '2px',
        ...style,
      }}
    >
      <button
        type="button"
        title="Light theme"
        aria-label="Light theme"
        onClick={() => setTheme('light')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 8px',
          backgroundColor: theme === 'light' ? 'var(--bg-elevated)' : 'transparent',
          color: theme === 'light' ? 'var(--text-primary)' : 'var(--text-muted)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
      >
        <Sun size={14} />
      </button>

      <button
        type="button"
        title="Dark theme"
        aria-label="Dark theme"
        onClick={() => setTheme('dark')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 8px',
          backgroundColor: theme === 'dark' ? 'var(--bg-elevated)' : 'transparent',
          color: theme === 'dark' ? 'var(--text-primary)' : 'var(--text-muted)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
      >
        <Moon size={14} />
      </button>

      <button
        type="button"
        title="System theme"
        aria-label="System theme"
        onClick={() => setTheme('system')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 8px',
          backgroundColor: theme === 'system' ? 'var(--bg-elevated)' : 'transparent',
          color: theme === 'system' ? 'var(--text-primary)' : 'var(--text-muted)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
        }}
      >
        <Monitor size={14} />
      </button>
    </div>
  );
};

export const Navbar = () => {
  const { user, isAuthenticated, isSeeker, isEmployer, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--navbar-h)',
        backgroundColor: 'var(--bg-raised)',
        borderBottom: '1px solid var(--border)',
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            fontWeight: 'var(--weight-bold)',
            fontSize: 'var(--text-lg)',
            letterSpacing: '-0.02em',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            <Briefcase size={18} color="#ffffff" />
          </div>
          <span>Job<span style={{ color: 'var(--accent-hover)' }}>Pulse</span></span>
        </Link>

        {/* Desktop Nav Links */}
        <div
          className="desktop-links"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >

          {isSeeker && (
            <>
              <Link
                to="/seeker/saved-jobs"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: isActive('/seeker/saved-jobs') ? 'var(--accent-hover)' : 'var(--text-secondary)',
                  fontWeight: 'var(--weight-medium)',
                  fontSize: 'var(--text-sm)',
                  textDecoration: 'none',
                }}
              >
                <Bookmark size={16} />
                <span>Saved</span>
              </Link>
              <Link
                to="/seeker/applications"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: isActive('/seeker/applications') ? 'var(--accent-hover)' : 'var(--text-secondary)',
                  fontWeight: 'var(--weight-medium)',
                  fontSize: 'var(--text-sm)',
                  textDecoration: 'none',
                }}
              >
                <FileText size={16} />
                <span>Applications</span>
              </Link>
            </>
          )}

          {isEmployer && (
            <>
              <Link
                to="/employer/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: isActive('/employer/dashboard') ? 'var(--accent-hover)' : 'var(--text-secondary)',
                  fontWeight: 'var(--weight-medium)',
                  fontSize: 'var(--text-sm)',
                  textDecoration: 'none',
                }}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/employer/jobs"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: isActive('/employer/jobs') ? 'var(--accent-hover)' : 'var(--text-secondary)',
                  fontWeight: 'var(--weight-medium)',
                  fontSize: 'var(--text-sm)',
                  textDecoration: 'none',
                }}
              >
                <Briefcase size={16} />
                <span>My Listings</span>
              </Link>
              <Link to="/employer/jobs/new" style={{ textDecoration: 'none' }}>
                <Button size="sm" variant="primary">
                  <PlusCircle size={15} />
                  <span>Post Job</span>
                </Button>
              </Link>
            </>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: isActive('/admin') ? 'var(--accent-hover)' : 'var(--text-secondary)',
                fontWeight: 'var(--weight-medium)',
                fontSize: 'var(--text-sm)',
                textDecoration: 'none',
              }}
            >
              <Shield size={16} />
              <span>Admin Panel</span>
            </Link>
          )}
        </div>

        {/* Right Auth Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeToggle />

          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-medium)',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-muted)',
                    color: 'var(--accent-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--weight-bold)',
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span>{user?.name?.split(' ')[0]}</span>
              </button>

              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '200px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '6px',
                    zIndex: 1000,
                  }}
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border)',
                      marginBottom: '4px',
                    }}
                  >
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Signed in as</div>
                    <div className="truncate" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' }}>
                      {user?.email}
                    </div>
                  </div>

                  {isSeeker && (
                    <Link
                      to="/seeker/profile"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-sm)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <User size={15} />
                      <span>Edit Profile</span>
                    </Link>
                  )}

                  {isEmployer && (
                    <Link
                      to="/employer/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-sm)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <LayoutDashboard size={15} />
                      <span>Dashboard</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      color: 'var(--red)',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--red-bg)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'var(--navbar-h)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            padding: 'var(--space-4) var(--space-6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {isSeeker && (
            <>
              <Link
                to="/seeker/saved-jobs"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '8px 0' }}
              >
                Saved Jobs
              </Link>
              <Link
                to="/seeker/applications"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '8px 0' }}
              >
                My Applications
              </Link>
              <Link
                to="/seeker/profile"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '8px 0' }}
              >
                Profile
              </Link>
            </>
          )}
          {isEmployer && (
            <>
              <Link
                to="/employer/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '8px 0' }}
              >
                Dashboard
              </Link>
              <Link
                to="/employer/jobs"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '8px 0' }}
              >
                My Job Listings
              </Link>
              <Link
                to="/employer/jobs/new"
                onClick={() => setMobileMenuOpen(false)}
                style={{ color: 'var(--accent-hover)', textDecoration: 'none', padding: '8px 0', fontWeight: 'bold' }}
              >
                + Post a New Job
              </Link>
            </>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--text-primary)', textDecoration: 'none', padding: '8px 0' }}
            >
              Admin Dashboard
            </Link>
          )}

          {/* Mobile Theme Control Row */}
          <div
            style={{
              padding: '12px 0 4px 0',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', color: 'var(--text-muted)' }}>
              Theme
            </span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  );
};
