import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { JobBrowser } from './pages/jobs/JobBrowser';
import { JobDetailPage } from './pages/jobs/JobDetailPage';

// Seeker Pages
import { SavedJobs } from './pages/seeker/SavedJobs';
import { MyApplications } from './pages/seeker/MyApplications';
import { Profile } from './pages/seeker/Profile';

// Employer Pages
import { Dashboard } from './pages/employer/Dashboard';
import { JobList } from './pages/employer/JobList';
import { JobCreateEdit } from './pages/employer/JobCreateEdit';
import { JobApplications } from './pages/employer/JobApplications';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Navbar />
              <main className="page-content">
                <Routes>
                  {/* Public / Shared */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/jobs" element={<JobBrowser />} />
                  <Route path="/jobs/:id" element={<JobDetailPage />} />

                  {/* Seeker Only */}
                  <Route
                    path="/seeker/saved-jobs"
                    element={
                      <ProtectedRoute allowedRoles={['seeker']}>
                        <SavedJobs />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/seeker/applications"
                    element={
                      <ProtectedRoute allowedRoles={['seeker']}>
                        <MyApplications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/seeker/profile"
                    element={
                      <ProtectedRoute allowedRoles={['seeker']}>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />

                  {/* Employer Only */}
                  <Route
                    path="/employer/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['employer']}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/employer/jobs"
                    element={
                      <ProtectedRoute allowedRoles={['employer']}>
                        <JobList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/employer/jobs/new"
                    element={
                      <ProtectedRoute allowedRoles={['employer']}>
                        <JobCreateEdit />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/employer/jobs/:id/edit"
                    element={
                      <ProtectedRoute allowedRoles={['employer']}>
                        <JobCreateEdit />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/employer/jobs/:id/applications"
                    element={
                      <ProtectedRoute allowedRoles={['employer']}>
                        <JobApplications />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Only */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
