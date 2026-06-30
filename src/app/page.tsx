"use client";

import { useState, useEffect, useMemo } from 'react';
import { loadData, type AppData, isIncome, isExpense, getCategoryName } from '@/lib/api';
import { createPortal } from 'react-dom';
import { useGoogleLogin } from '@react-oauth/google';

import DashboardCharts from '@/components/DashboardCharts';

export default function Dashboard() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAction, setModalAction] = useState<{ type: 'alert' | 'confirm', message: string; onConfirm?: () => void } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file profile email',
    onSuccess: (codeResponse) => {
      localStorage.setItem('google_access_token', codeResponse.access_token);
      window.location.reload();
    },
    onError: (error) => console.error('Login Failed:', error)
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    async function init() {
      const appData = await loadData();
      if (!appData) {
        setError('画面右上のボタンからGoogleでログインしてください。');
      } else {
        setData(appData);
      }
      setLoading(false);
    }
    init();
  }, []);

  const availableYears = useMemo(() => {
    if (!data) return [];
    const years = new Set(data.transactions.map(t => t.date.substring(0, 4)));
    const sorted = Array.from(years).sort().reverse();
    return sorted.length > 0 ? sorted : [new Date().getFullYear().toString()];
  }, [data]);

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  if (loading) return <div className="animate-fade-in">読み込み中...</div>;

  if (error) {
    return (
      <>
        <div className="card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>👋 ようこそ CashFlow へ</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
            {error}
          </p>
          <div className="button-group">
            <button className="btn" onClick={() => login()} style={{ backgroundColor: '#ffffff', color: '#1f2937', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}>
              <svg width="16" height="16" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span style={{ fontWeight: 600 }}>Googleでログイン</span>
            </button>
            <button className="btn btn-secondary" onClick={() => {
              setModalAction({
                type: 'confirm',
                message: 'ログインせずにアプリの機能を試すことができますが、入力したデータはクラウドに保存されず、ブラウザのデータが消えると失われます。このまま進みますか？',
                onConfirm: () => {
                  sessionStorage.setItem('trial_mode', 'true');
                  window.location.reload();
                }
              });
            }}>
               ログインせずに使う
            </button>
          </div>
        </div>

        {modalAction && mounted && createPortal(
          <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setModalAction(null)}>
            <div className="card" style={{ minWidth: '320px', maxWidth: '400px', zIndex: 101, animation: 'fadeIn 0.2s ease forwards', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚠️ 確認！！
              </h3>
              <p style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                {modalAction.message}
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                {modalAction.type === 'confirm' && (
                  <button className="btn btn-secondary" onClick={() => setModalAction(null)} style={{ padding: '0.5rem 1rem' }}>キャンセル</button>
                )}
                <button className="btn" style={{ backgroundColor: 'var(--danger-color)', padding: '0.5rem 1rem' }} onClick={() => {
                  if (modalAction.onConfirm) modalAction.onConfirm();
                  else setModalAction(null);
                }}>OK</button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  const accounts = data?.accounts || [];
  const yearTx = data?.transactions.filter(t => t.date.startsWith(selectedYear)) || [];
  const income = yearTx.filter(t => isIncome(t, accounts)).reduce((sum, t) => sum + t.amount, 0) || 0;
  const expense = yearTx.filter(t => isExpense(t, accounts)).reduce((sum, t) => sum + t.amount, 0) || 0;
  const balance = income - expense;

  const recentTx = yearTx.slice(0, 5) || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.5px' }}>ダッシュボード</h1>
        <select className="form-input" style={{ width: 'auto', marginBottom: 0, padding: '0.5rem 1rem' }} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}年度</option>
          ))}
        </select>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ borderTop: '4px solid var(--success-color)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>総収入</div>
          <div className="stat-value" style={{ color: 'var(--success-color)' }}>¥{income.toLocaleString()}</div>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--danger-color)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>総支出</div>
          <div className="stat-value" style={{ color: 'var(--danger-color)' }}>¥{expense.toLocaleString()}</div>
        </div>
        <div className="card" style={{ borderTop: `4px solid ${balance >= 0 ? 'var(--accent-color)' : 'var(--danger-color)'}` }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>利益 (残高)</div>
          <div className="stat-value">¥{balance.toLocaleString()}</div>
        </div>
      </div>

      {data && <DashboardCharts data={{...data, transactions: yearTx}} />}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>最近の取引</h2>
        </div>
        
        {recentTx.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>履歴がありません。上部のメニューから収入または支出を追加してください。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentTx.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{getCategoryName(tx, accounts)}</span>
                    {tx.clientName || tx.itemName || '名称未設定'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {tx.date}
                    {tx.unitPrice && tx.quantity ? ` · @${tx.unitPrice.toLocaleString()}円 × ${tx.quantity}` : ''}
                    {tx.memo ? ` · ${tx.memo}` : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: isIncome(tx, accounts) ? 'var(--success-color)' : 'var(--danger-color)', display: 'flex', alignItems: 'center' }}>
                  {isIncome(tx, accounts) ? '+' : '-'}¥{tx.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
