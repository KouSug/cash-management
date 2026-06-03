"use client";

import { useState, useEffect } from 'react';
import { loadData, AppData } from '@/lib/api';
import { createPortal } from 'react-dom';
import Link from 'next/link';

import DashboardCharts from '@/components/DashboardCharts';

export default function Dashboard() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAction, setModalAction] = useState<{ type: 'alert' | 'confirm', message: string; onConfirm?: () => void } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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

  if (loading) return <div className="animate-fade-in">読み込み中...</div>;

  if (error) {
    return (
      <>
        <div className="card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '1rem' }}>👋 ようこそ CashFlow へ</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
            {error}
          </p>
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

  const income = data?.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
  const expense = data?.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
  const balance = income - expense;

  const recentTx = data?.transactions.slice(0, 5) || [];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.5px' }}>ダッシュボード</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ borderTop: '4px solid var(--success-color)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>総収入</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success-color)', letterSpacing: '-1px' }}>¥{income.toLocaleString()}</div>
        </div>
        <div className="card" style={{ borderTop: '4px solid var(--danger-color)' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>総支出</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--danger-color)', letterSpacing: '-1px' }}>¥{expense.toLocaleString()}</div>
        </div>
        <div className="card" style={{ borderTop: `4px solid ${balance >= 0 ? 'var(--accent-color)' : 'var(--danger-color)'}` }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>利益 (残高)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-1px' }}>¥{balance.toLocaleString()}</div>
        </div>
      </div>

      {data && <DashboardCharts data={data} />}

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
                    <span style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tx.category}</span>
                    {tx.clientName || tx.itemName || '名称未設定'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {tx.date}
                    {tx.unitPrice && tx.quantity ? ` · @${tx.unitPrice.toLocaleString()}円 × ${tx.quantity}` : ''}
                    {tx.memo ? ` · ${tx.memo}` : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: tx.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)', display: 'flex', alignItems: 'center' }}>
                  {tx.type === 'income' ? '+' : '-'}¥{tx.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
