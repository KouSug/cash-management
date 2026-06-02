"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useGoogleLogin } from '@react-oauth/google';

export default function Settings() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('google_access_token'));
  }, []);

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file',
    onSuccess: (codeResponse) => {
      localStorage.setItem('google_access_token', codeResponse.access_token);
      setToken(codeResponse.access_token);
    },
    onError: (error) => console.log('Login Failed:', error)
  });

  const logout = () => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_folder_id');
    localStorage.removeItem('google_file_id');
    setToken(null);
  };

  return (
    <div className="card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>⚙️ 設定 (Settings)</h1>
        <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          ✕ 閉じる
        </Link>
      </div>
      
      <div className="form-group" style={{ textAlign: 'center', padding: '2rem 0' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Googleドライブ連携</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
          このアプリはデータをGoogleドライブに保存します。<br/>
          データは「ApplicationData」という専用フォルダに安全に保管されます。
        </p>

        {token ? (
          <div>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 600 }}>
              ✓ Googleドライブに接続済みです
            </div>
            <button className="btn btn-secondary" onClick={logout}>
              ログアウト
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => login()} style={{ backgroundColor: '#4285F4', color: 'white' }}>
            Googleでログイン
          </button>
        )}
      </div>
    </div>
  );
}
