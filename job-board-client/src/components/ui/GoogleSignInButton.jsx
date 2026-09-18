import React, { useEffect, useRef } from 'react';
import { googleAuth } from '../../api/auth';

export const GoogleSignInButton = ({ role, onSuccess, onError }) => {
  const btnRef = useRef(null);
  const roleRef = useRef(role);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Keep refs synced with props to avoid stale closures in GIS callback
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let intervalId = null;
    let isCancelled = false;

    const initGoogleSignIn = () => {
      if (
        typeof window !== 'undefined' &&
        window.google &&
        window.google.accounts &&
        window.google.accounts.id
      ) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }

        if (isCancelled || !btnRef.current) return;

        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: async (response) => {
              try {
                const data = await googleAuth({
                  credential: response.credential,
                  role: roleRef.current,
                });
                if (onSuccessRef.current) {
                  onSuccessRef.current(data);
                }
              } catch (err) {
                if (onErrorRef.current) {
                  onErrorRef.current(err);
                }
              }
            },
          });

          // Clear any previous rendered button elements inside the container
          btnRef.current.innerHTML = '';

          window.google.accounts.id.renderButton(
            btnRef.current,
            { theme: 'outline', size: 'large', width: 320, text: 'continue_with' }
          );
        } catch (err) {
          console.error('Failed to initialize Google Sign-In button:', err);
        }
        return true;
      }
      return false;
    };

    // Try immediately
    const initialized = initGoogleSignIn();

    // If script is still loading async, poll every 100ms up to 10 seconds
    if (!initialized) {
      let attempts = 0;
      const maxAttempts = 100;
      intervalId = setInterval(() => {
        attempts++;
        if (initGoogleSignIn() || attempts >= maxAttempts) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }, 100);
    }

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        minHeight: '44px',
      }}
    >
      <div id="google-signin-btn" ref={btnRef}></div>
    </div>
  );
};

export default GoogleSignInButton;
