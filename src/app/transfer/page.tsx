"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { loadData, saveData, AppData, Account, Transaction } from '@/lib/api';

export default function TransferPage() {
  const router = useRouter();
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    async function init() {
      const appData = await loadData();
      if (appData) {
        setData(appData);
        // Default accounts (e.g. from 売掛金 to 普通預金, or 現金 to 普通預金)
        const transferAccounts = appData.accounts.filter(a => ['asset', 'liability', 'equity'].includes(a.type));
        
        if (transferAccounts.length >= 2) {
          const uikake = transferAccounts.find(a => a.name === '売掛金');
          const bank = transferAccounts.find(a => a.name === '普通預金');
          const cash = transferAccounts.find(a => a.name === '現金');
          
          setFromAccountId(uikake?.id || cash?.id || transferAccounts[0].id);
          setToAccountId(bank?.id || transferAccounts[1].id);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (fromAccountId === toAccountId) {
      alert('移動元と移動先には異なる口座を選択してください。');
      return;
    }

    setSaving(true);
    try {
      const numAmount = parseInt(amount, 10);
      
      const transaction: Transaction = {
        id: Date.now().toString(),
        date,
        amount: numAmount,
        debitAccountId: toAccountId,   // 移動先（増える方）は借方
        creditAccountId: fromAccountId, // 移動元（減る方）は貸方
        memo: memo || '資金移動'
      };

      const newData = {
        ...data,
        transactions: [...data.transactions, transaction]
      };
      
      const success = await saveData(newData);
      if (!success) throw new Error('Failed to save data');
      
      router.push('/ledger');
    } catch (error) {
      console.error(error);
      alert('保存に失敗しました。');
      setSaving(false);
    }
  };

  if (loading) return <div>読み込み中...</div>;
  if (!data) return <div>データがありません。ログインしてください。</div>;

  const transferAccounts = data.accounts.filter(a => ['asset', 'liability', 'equity'].includes(a.type));

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.5px' }}>資金移動 (振替)</h1>
      
      <form className="card" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
        
        <div className="form-group">
          <label className="form-label">日付 <span style={{ color: 'var(--danger-color)' }}>*</span></label>
          <input 
            type="date" 
            className="form-input" 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            required
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">移動元 (減る口座) <span style={{ color: 'var(--danger-color)' }}>*</span></label>
            <select 
              className="form-input" 
              value={fromAccountId} 
              onChange={e => setFromAccountId(e.target.value)}
              required
            >
              <option value="">選択してください</option>
              {transferAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '1.5rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-color)' }}>
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>

          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">移動先 (増える口座) <span style={{ color: 'var(--danger-color)' }}>*</span></label>
            <select 
              className="form-input" 
              value={toAccountId} 
              onChange={e => setToAccountId(e.target.value)}
              required
            >
              <option value="">選択してください</option>
              {transferAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">金額 (円) <span style={{ color: 'var(--danger-color)' }}>*</span></label>
          <input 
            type="number" 
            className="form-input" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            placeholder="0" 
            min="1"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">摘要 (メモ)</label>
          <input 
            type="text" 
            className="form-input" 
            value={memo} 
            onChange={e => setMemo(e.target.value)} 
            placeholder="例: クラウドソーシング6月分 振込" 
          />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            ※「売掛金の回収」「クレジットカードの引き落とし」「事業用口座から生活費の引き出し」などに使用します。
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button type="submit" className="btn" disabled={saving || !fromAccountId || !toAccountId || !amount} style={{ flex: 1 }}>
            {saving ? '保存中...' : '登録する'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.push('/')} disabled={saving} style={{ flex: 1 }}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
