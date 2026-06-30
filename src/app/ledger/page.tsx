"use client";

import { useState, useEffect, useMemo } from 'react';
import { loadData, AppData, Account } from '@/lib/api';

export default function LedgerPage() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  useEffect(() => {
    async function init() {
      const appData = await loadData();
      if (appData) {
        setData(appData);
        if (appData.accounts.length > 0) {
          const defaultAcc = appData.accounts.find(a => a.name === '現金') || appData.accounts[0];
          setSelectedAccountId(defaultAcc.id);
        }
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

  if (loading) return <div>読み込み中...</div>;
  if (!data) return <div>データがありません。ログインしてください。</div>;

  const accounts = data.accounts;
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  // 選択された勘定科目の当期取引を抽出
  const ledgerEntries = data.transactions
    .filter(tx => 
      (tx.debitAccountId === selectedAccountId || tx.creditAccountId === selectedAccountId) &&
      tx.date.startsWith(selectedYear)
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || Number(a.id) - Number(b.id));

  // 期首残高の計算 (資産・負債・資本のみ)
  let openingBalance = 0;
  if (selectedAccount && selectedAccount.type !== 'revenue' && selectedAccount.type !== 'expense') {
    const isDebitIncrease = selectedAccount.type === 'asset';
    const priorTx = data.transactions.filter(tx => 
      (tx.debitAccountId === selectedAccountId || tx.creditAccountId === selectedAccountId) &&
      tx.date.substring(0, 4) < selectedYear
    );
    
    priorTx.forEach(tx => {
      const isDebit = tx.debitAccountId === selectedAccountId;
      if (isDebit) {
        openingBalance += isDebitIncrease ? tx.amount : -tx.amount;
      } else {
        openingBalance += isDebitIncrease ? -tx.amount : tx.amount;
      }
    });
  }

  let runningBalance = openingBalance;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.5px' }}>総勘定元帳</h1>
        <select className="form-input" style={{ width: 'auto', marginBottom: 0, padding: '0.5rem 1rem' }} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}年度</option>
          ))}
        </select>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 600 }}>勘定科目を選択:</label>
          <select className="form-input" style={{ width: 'auto', marginBottom: 0 }} value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
            ))}
          </select>
        </div>

        {ledgerEntries.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>この科目の取引はありません。</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>相手勘定</th>
                  <th>摘要 (クライアント/品名・メモ)</th>
                  <th style={{ textAlign: 'right' }}>借方 (Debit)</th>
                  <th style={{ textAlign: 'right' }}>貸方 (Credit)</th>
                  <th style={{ textAlign: 'right' }}>残高</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ backgroundColor: 'var(--bg-surface-hover)' }}>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {selectedYear}年 期首残高 (前年からの繰越)
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ¥{openingBalance.toLocaleString()}
                  </td>
                </tr>
                {ledgerEntries.map(tx => {
                  const isDebit = tx.debitAccountId === selectedAccountId;
                  
                  // 相手勘定を特定
                  const counterpartId = isDebit ? tx.creditAccountId : tx.debitAccountId;
                  const counterpartName = accounts.find(a => a.id === counterpartId)?.name || '不明';

                  // 残高計算のロジック:
                  // 資産・費用の場合は、借方でプラス、貸方でマイナス
                  // 負債・純資産・収益の場合は、貸方でプラス、借方でマイナス
                  const isDebitIncrease = selectedAccount?.type === 'asset' || selectedAccount?.type === 'expense';
                  
                  if (isDebit) {
                    runningBalance += isDebitIncrease ? tx.amount : -tx.amount;
                  } else {
                    runningBalance += isDebitIncrease ? -tx.amount : tx.amount;
                  }

                  const memoText = [tx.clientName || tx.itemName, tx.memo].filter(Boolean).join(' / ');

                  return (
                    <tr key={tx.id}>
                      <td>{tx.date}</td>
                      <td>
                        <span style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {counterpartName}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>{memoText || '-'}</td>
                      <td style={{ textAlign: 'right', color: isDebit ? 'var(--text-primary)' : 'transparent' }}>
                        {isDebit ? `¥${tx.amount.toLocaleString()}` : ''}
                      </td>
                      <td style={{ textAlign: 'right', color: !isDebit ? 'var(--text-primary)' : 'transparent' }}>
                        {!isDebit ? `¥${tx.amount.toLocaleString()}` : ''}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ¥{runningBalance.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
