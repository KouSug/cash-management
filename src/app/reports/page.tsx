"use client";

import { useState, useEffect, useMemo } from 'react';
import { loadData, AppData, AccountType } from '@/lib/api';

export default function ReportsPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const appData = await loadData();
      if (appData) setData(appData);
      setLoading(false);
    }
    init();
  }, []);

  const balances = useMemo(() => {
    if (!data) return {};
    const bals: Record<string, number> = {};
    
    // Initialize balances
    data.accounts.forEach(a => bals[a.id] = 0);

    data.transactions.forEach(tx => {
      // 借方 (Debit)
      const debitAcc = data.accounts.find(a => a.id === tx.debitAccountId);
      if (debitAcc) {
        if (debitAcc.type === 'asset' || debitAcc.type === 'expense') {
          bals[debitAcc.id] += tx.amount;
        } else {
          bals[debitAcc.id] -= tx.amount;
        }
      }
      
      // 貸方 (Credit)
      const creditAcc = data.accounts.find(a => a.id === tx.creditAccountId);
      if (creditAcc) {
        if (creditAcc.type === 'liability' || creditAcc.type === 'equity' || creditAcc.type === 'revenue') {
          bals[creditAcc.id] += tx.amount;
        } else {
          bals[creditAcc.id] -= tx.amount;
        }
      }
    });
    return bals;
  }, [data]);

  if (loading) return <div>読み込み中...</div>;
  if (!data) return <div>データがありません。</div>;

  const accounts = data.accounts;

  // BS (貸借対照表)
  const assets = accounts.filter(a => a.type === 'asset');
  const liabilities = accounts.filter(a => a.type === 'liability');
  const equity = accounts.filter(a => a.type === 'equity');

  const totalAssets = assets.reduce((sum, a) => sum + balances[a.id], 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + balances[a.id], 0);
  const totalEquity = equity.reduce((sum, a) => sum + balances[a.id], 0);

  // PL (損益計算書)
  const revenue = accounts.filter(a => a.type === 'revenue');
  const expenses = accounts.filter(a => a.type === 'expense');

  const totalRevenue = revenue.reduce((sum, a) => sum + balances[a.id], 0);
  const totalExpenses = expenses.reduce((sum, a) => sum + balances[a.id], 0);
  
  // 当期純利益 (Net Income) = 収益 - 費用
  const netIncome = totalRevenue - totalExpenses;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.5px' }}>決算書 (青色申告対応)</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* 損益計算書 (PL) */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>損益計算書 (P/L)</h2>
          
          <h3 style={{ fontSize: '1rem', color: 'var(--success-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>売上金額等 (収益)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {revenue.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{a.name}</span>
                <span>¥{balances[a.id].toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
              <span>収益合計</span>
              <span style={{ color: 'var(--success-color)' }}>¥{totalRevenue.toLocaleString()}</span>
            </div>
          </div>

          <h3 style={{ fontSize: '1rem', color: 'var(--danger-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>経費 (費用)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {expenses.map(a => balances[a.id] > 0 && (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{a.name}</span>
                <span>¥{balances[a.id].toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
              <span>費用合計</span>
              <span style={{ color: 'var(--danger-color)' }}>¥{totalExpenses.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.25rem', padding: '1rem', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '8px' }}>
            <span>当期純利益 (青色申告特別控除前)</span>
            <span style={{ color: netIncome >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
              ¥{netIncome.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 貸借対照表 (BS) */}
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>貸借対照表 (B/S)</h2>
          
          <div style={{ display: 'flex', gap: '2rem' }}>
            {/* 借方 (資産) */}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>資産の部</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {assets.map(a => balances[a.id] !== 0 && (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.name}</span>
                    <span>¥{balances[a.id].toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 貸方 (負債・純資産) */}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>負債の部</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {liabilities.map(a => balances[a.id] !== 0 && (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.name}</span>
                    <span>¥{balances[a.id].toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>資本の部</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {equity.map(a => balances[a.id] !== 0 && (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.name}</span>
                    <span>¥{balances[a.id].toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-color)', fontWeight: 600 }}>
                  <span>当期純利益</span>
                  <span>¥{netIncome.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem', borderTop: '2px solid var(--border-color)', paddingTop: '1rem', fontWeight: 700 }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
              <span>資産合計</span>
              <span>¥{totalAssets.toLocaleString()}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
              <span>負債・資本合計</span>
              {/* 負債 + 元入金等 + 当期純利益 */}
              <span>¥{(totalLiabilities + totalEquity + netIncome).toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
