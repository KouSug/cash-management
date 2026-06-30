"use client";

import { useState, useEffect } from 'react';
import { loadData, saveData, AppData, Account, AccountType } from '@/lib/api';

export default function AccountSettings() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states for new account
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AccountType>('asset');

  useEffect(() => {
    async function init() {
      const appData = await loadData();
      if (appData) setData(appData);
      setLoading(false);
    }
    init();
  }, []);

  const handleAddAccount = async () => {
    if (!data || !newName.trim()) return;

    const newAccount: Account = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
      name: newName.trim(),
      type: newType,
      isSystem: false
    };

    const newData = {
      ...data,
      accounts: [...data.accounts, newAccount]
    };

    const success = await saveData(newData);
    if (success) {
      setData(newData);
      setNewName('');
    } else {
      alert('保存に失敗しました。');
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!data) return;
    
    // Check if account is in use
    const inUse = data.transactions.some(tx => tx.debitAccountId === id || tx.creditAccountId === id);
    if (inUse) {
      alert('この勘定科目は既に取引で使用されているため削除できません。');
      return;
    }

    if (!confirm('本当に削除しますか？')) return;

    const newData = {
      ...data,
      accounts: data.accounts.filter(a => a.id !== id)
    };

    const success = await saveData(newData);
    if (success) {
      setData(newData);
    } else {
      alert('削除に失敗しました。');
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (!data) return <div>ログインしてください。</div>;

  const typeLabels: Record<AccountType, string> = {
    'asset': '資産 (口座・現金)',
    'liability': '負債 (クレジットカードなど)',
    'equity': '純資産 (元入金など)',
    'revenue': '収益 (売上など)',
    'expense': '費用 (経費など)'
  };

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>勘定科目・決済手段の管理</h2>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: 2, minWidth: '200px' }}>
          <label className="form-label">科目名</label>
          <input type="text" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="例: PayPay, 交通費など" />
        </div>
        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
          <label className="form-label">種類</label>
          <select className="form-input" value={newType} onChange={e => setNewType(e.target.value as AccountType)}>
            {Object.entries(typeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <button className="btn" onClick={handleAddAccount} style={{ height: '42px', padding: '0 1.5rem' }}>追加</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>科目名</th>
              <th>種類</th>
              <th style={{ width: '80px', textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {data.accounts.map(acc => (
              <tr key={acc.id}>
                <td style={{ fontWeight: 500 }}>{acc.name}</td>
                <td>
                  <span style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {typeLabels[acc.type]}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {!acc.isSystem && (
                    <button className="btn-icon" onClick={() => handleDeleteAccount(acc.id)} title="削除" style={{ color: 'var(--danger-color)' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  )}
                  {acc.isSystem && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>基本科目</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
