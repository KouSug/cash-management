"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Settings() {
  const [dataPath, setDataPath] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const savedPath = localStorage.getItem('cashAppDataPath');
    if (savedPath) {
      setDataPath(savedPath);
    }
  }, []);

  const handleSave = () => {
    if (!dataPath) {
      setSaveStatus('パスを入力してください。');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    localStorage.setItem('cashAppDataPath', dataPath);
    setSaveStatus('保存しました！');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleBrowse = async () => {
    try {
      const res = await fetch('/api/pick-file');
      const data = await res.json();
      if (data.path) {
        setDataPath(data.path);
      } else if (data.error) {
        alert('フォルダ選択ダイアログの表示に失敗しました。: ' + data.error);
      }
    } catch (err) {
      alert('エラーが発生しました。手動でパスを入力してください。');
    }
  };

  return (
    <div className="card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>⚙️ 設定 (Settings)</h1>
        <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          ✕ 閉じる
        </Link>
      </div>
      
      <div className="form-group">
        <label className="form-label" htmlFor="dataPath">
          データファイルの保存先パス (絶対パス)
        </label>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
          クラウドストレージ（Dropbox, Google Driveなど）のローカルフォルダ内のパスを指定することで、複数端末で同期できます。<br/><br/>
          例 (Windows): <code style={{background: 'var(--bg-color)', padding: '0.2rem', borderRadius: '4px'}}>C:\Users\Username\Dropbox\cash-data.json</code><br/>
          例 (Mac): <code style={{background: 'var(--bg-color)', padding: '0.2rem', borderRadius: '4px'}}>/Users/Username/Dropbox/cash-data.json</code>
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            id="dataPath"
            type="text" 
            className="form-input" 
            style={{ flex: 1 }}
            value={dataPath}
            onChange={(e) => setDataPath(e.target.value)}
            placeholder="絶対パスを入力..."
          />
          <button type="button" className="btn btn-secondary" onClick={handleBrowse}>
            参照...
          </button>
        </div>
      </div>

      <button className="btn" onClick={handleSave}>
        保存する
      </button>

      {saveStatus && (
        <p style={{ marginTop: '1rem', color: saveStatus.includes('入力') ? 'var(--danger-color)' : 'var(--success-color)', fontWeight: 500 }}>
          {saveStatus}
        </p>
      )}
    </div>
  );
}
