"use client";

import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { createPortal } from 'react-dom';

export default function HeaderAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [picture, setPicture] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fetchProfile = async (accessToken: string) => {
    try {
      const res = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`);
      if (res.ok) {
        const data = await res.json();
        if (data.picture) {
          localStorage.setItem('google_user_picture', data.picture);
          setPicture(data.picture);
        }
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
    }
  };

  useEffect(() => {
    setMounted(true);
    const storedToken = localStorage.getItem('google_access_token');
    const storedPic = localStorage.getItem('google_user_picture');
    
    setToken(storedToken);
    setPicture(storedPic);

    if (storedToken && !storedPic) {
      fetchProfile(storedToken);
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sessionStorage.getItem('trial_mode') === 'true') {
        e.preventDefault();
        e.returnValue = ''; // Chrome/Edge
        return ''; // Legacy browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file profile email',
    onSuccess: (codeResponse) => {
      localStorage.setItem('google_access_token', codeResponse.access_token);
      setToken(codeResponse.access_token);
      fetchProfile(codeResponse.access_token);
      // Reload to ensure all components pick up the new auth state
      window.location.reload();
    },
    onError: (error) => console.log('Login Failed:', error)
  });

  const logout = () => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_folder_id');
    localStorage.removeItem('google_file_id');
    localStorage.removeItem('google_user_picture');
    setToken(null);
    setPicture(null);
    setShowLogoutConfirm(false);
    // Reload to clear auth state from memory
    window.location.reload();
  };

  if (!mounted) return null;

  return (
    <>
      {token ? (
        <button 
          onClick={() => setShowLogoutConfirm(true)}
          style={{ 
            background: 'none', 
            cursor: 'pointer', 
            padding: 0, 
            borderRadius: '50%',
            overflow: 'hidden',
            width: '36px',
            height: '36px',
            marginLeft: '1rem',
            border: '2px solid var(--border-color)',
            transition: 'transform 0.2s'
          }}
          title="ログアウト"
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--accent-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              👤
            </div>
          )}
        </button>
      ) : (
        <button className="btn" onClick={() => login()} style={{ backgroundColor: '#ffffff', color: '#1f2937', padding: '0.4rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #d1d5db', marginLeft: '1rem', fontSize: '0.875rem' }}>
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span style={{ fontWeight: 600 }}>ログイン</span>
        </button>
      )}

      {showLogoutConfirm && mounted && createPortal(
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="card" style={{ minWidth: '320px', maxWidth: '400px', zIndex: 101, animation: 'fadeIn 0.2s ease forwards', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ 確認！！
            </h3>
            <p style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              ログアウトしますか？
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowLogoutConfirm(false)} style={{ padding: '0.5rem 1rem' }}>キャンセル</button>
              <button className="btn" style={{ backgroundColor: 'var(--danger-color)', padding: '0.5rem 1rem' }} onClick={logout}>OK</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
