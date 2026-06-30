"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { loadData, saveData, AppData, Transaction, Account, isIncome, isExpense, getCategoryName, getPaymentMethodName } from '@/lib/api';
import { useGoogleLogin } from '@react-oauth/google';

export default function TransactionView({ type }: { type: 'income' | 'expense' }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [itemName, setItemName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [memo, setMemo] = useState('');

  // Filter states
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Custom modal dialog state
  const [modalAction, setModalAction] = useState<{ type: 'alert' | 'confirm', message: string; onConfirm?: () => void } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds([]);
  }, [filterMonth, filterCategory]);

  const [mounted, setMounted] = useState(false);

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
    setDate(new Date().toISOString().split('T')[0]);

    async function init() {
      const appData = await loadData();
      if (!appData) {
        setError('画面右上のボタンからGoogleでログインしてください。');
      } else {
        setData(appData);
        // Set defaults
        const categories = appData.accounts.filter(a => a.type === (type === 'income' ? 'revenue' : 'expense'));
        if (categories.length > 0) setCategoryId(categories[0].id);
        const paymentMethods = appData.accounts.filter(a => a.type === 'asset' || a.type === 'liability');
        if (paymentMethods.length > 0) {
          const defaultPayment = paymentMethods.find(a => a.name === '現金') || paymentMethods[0];
          setPaymentMethodId(defaultPayment.id);
        }
      }
      setLoading(false);
    }
    init();
  }, [type]);

  useEffect(() => {
    if (isFormOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFormOpen]);

  const resetForm = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setClientName('');
    setItemName('');
    setUnitPrice('');
    setQuantity('1');
    if (data) {
      const categories = data.accounts.filter(a => a.type === (type === 'income' ? 'revenue' : 'expense'));
      if (categories.length > 0) setCategoryId(categories[0].id);
      const paymentMethods = data.accounts.filter(a => a.type === 'asset' || a.type === 'liability');
      if (paymentMethods.length > 0) {
        const defaultPayment = paymentMethods.find(a => a.name === '現金') || paymentMethods[0];
        setPaymentMethodId(defaultPayment.id);
      }
    }
    setMemo('');
    setIsFormOpen(false);
  };

  const handleEdit = (tx: Transaction) => {
    if (!data) return;
    setEditingId(tx.id);
    setDate(tx.date);
    setClientName(tx.clientName || '');
    setItemName(tx.itemName || '');
    setUnitPrice(tx.unitPrice?.toString() || '');
    setQuantity(tx.quantity?.toString() || '1');
    
    if (type === 'income') {
      setCategoryId(tx.creditAccountId);
      setPaymentMethodId(tx.debitAccountId);
    } else {
      setCategoryId(tx.debitAccountId);
      setPaymentMethodId(tx.creditAccountId);
    }
    setMemo(tx.memo || '');
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!data) return;
    
    const price = Number(unitPrice);
    const qty = Number(quantity);
    if (!unitPrice || isNaN(price) || isNaN(qty) || qty <= 0) {
        setModalAction({ type: 'alert', message: '単価と個数を正しく入力してください。' });
        return;
    }
    
    if (type === 'income' && !clientName) {
        setModalAction({ type: 'alert', message: 'クライアント名を入力してください。' });
        return;
    }
    if (type === 'expense' && !itemName) {
        setModalAction({ type: 'alert', message: '品名を入力してください。' });
        return;
    }

    const calculatedAmount = price * qty;

    let debitId = '';
    let creditId = '';

    if (type === 'income') {
      debitId = paymentMethodId;
      creditId = categoryId;
    } else {
      debitId = categoryId;
      creditId = paymentMethodId;
    }

    const newTx: Transaction = {
      id: editingId || Date.now().toString(),
      date,
      debitAccountId: debitId,
      creditAccountId: creditId,
      amount: calculatedAmount,
      memo,
      unitPrice: price,
      quantity: qty,
      clientName: type === 'income' ? clientName : undefined,
      itemName: type === 'expense' ? itemName : undefined,
    };

    const newTransactions = editingId
      ? data.transactions.map(tx => tx.id === editingId ? newTx : tx)
      : [newTx, ...data.transactions];

    newTransactions.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return Number(b.id) - Number(a.id);
    });

    const newData = {
      ...data,
      transactions: newTransactions
    };

    const success = await saveData(newData);
    if (success) {
      setData(newData);
      resetForm();
    } else {
      setModalAction({ type: 'alert', message: '保存に失敗しました。' });
    }
  };

  const handleDelete = (id: string) => {
    if (!data) return;
    setModalAction({
      type: 'confirm',
      message: '本当にこのデータを削除しますか？',
      onConfirm: async () => {
        const newTransactions = data.transactions.filter(tx => tx.id !== id);
        const newData = { ...data, transactions: newTransactions };

        const success = await saveData(newData);
        if (success) {
          setData(newData);
          setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        } else {
          setModalAction({ type: 'alert', message: '削除に失敗しました。' });
          return;
        }
        setModalAction(null);
      }
    });
  };

  const handleBulkDelete = () => {
    if (!data || selectedIds.length === 0) return;
    setModalAction({
      type: 'confirm',
      message: `選択した${selectedIds.length}件のデータを削除しますか？`,
      onConfirm: async () => {
        const newTransactions = data.transactions.filter(tx => !selectedIds.includes(tx.id));
        const newData = { ...data, transactions: newTransactions };

        const success = await saveData(newData);
        if (success) {
          setData(newData);
          setSelectedIds([]);
        } else {
          setModalAction({ type: 'alert', message: '削除に失敗しました。' });
          return;
        }
        setModalAction(null);
      }
    });
  };

  if (loading) return <div className="animate-fade-in">読み込み中...</div>;

  if (error) {
    return (
      <>
        <div className="card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
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
  
  const allTypeTx = data?.transactions.filter(t => type === 'income' ? isIncome(t, accounts) : isExpense(t, accounts)) || [];
  
  const uniqueMonths = Array.from(new Set(allTypeTx.map(t => t.date.substring(0, 7)))).sort().reverse();
  
  const currentCategories = accounts.filter(a => a.type === (type === 'income' ? 'revenue' : 'expense'));
  const currentPaymentMethods = accounts.filter(a => a.type === 'asset' || a.type === 'liability');

  const filteredTx = allTypeTx.filter(t => {
    const matchMonth = filterMonth === 'all' || t.date.startsWith(filterMonth);
    const catId = type === 'income' ? t.creditAccountId : t.debitAccountId;
    const matchCategory = filterCategory === 'all' || catId === filterCategory;
    return matchMonth && matchCategory;
  });

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredTx.map(tx => tx.id));
    } else {
      setSelectedIds([]);
    }
  };

  const title = type === 'income' ? '収入' : '支出';
  const color = type === 'income' ? 'var(--success-color)' : 'var(--danger-color)';

  const calculatedAmount = (Number(unitPrice) || 0) * (Number(quantity) || 0);

  return (
    <>
      {isFormOpen && mounted && createPortal(
        <>
          <div className="drawer-overlay" onClick={resetForm} />
          <div className="drawer">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color }}>{title}の{editingId ? '編集' : '追加'}</h2>
        
        <div className="form-group">
          <label className="form-label">日付</label>
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        
        {type === 'income' ? (
          <div className="form-group">
            <label className="form-label">クライアント名</label>
            <input type="text" className="form-input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="株式会社〇〇" />
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">品名</label>
            <input type="text" className="form-input" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="PCモニター" />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">勘定科目 (カテゴリ)</label>
          <select className="form-input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            {currentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">決済手段</label>
          <select className="form-input" value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)}>
            {currentPaymentMethods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label className="form-label">単価 (円)</label>
            <input type="number" className="form-input" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0" />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">個数</label>
            <input type="number" className="form-input" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" />
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>合計金額</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color }}>¥{calculatedAmount.toLocaleString()}</span>
        </div>

        <div className="form-group">
          <label className="form-label">メモ</label>
          <input type="text" className="form-input" value={memo} onChange={e => setMemo(e.target.value)} placeholder="補足事項など..." />
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn" onClick={handleSave} style={{ flex: 1 }}>{editingId ? '更新する' : '追加する'}</button>
          <button className="btn btn-secondary" onClick={resetForm}>キャンセル</button>
        </div>
      </div>
      </>,
      document.body
      )}

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

    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-input" style={{ width: 'auto', marginBottom: 0, padding: '0.5rem 1rem' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              <option value="all">すべての月</option>
              {uniqueMonths.map(m => <option key={m} value={m}>{m.replace('-', '年')}月</option>)}
            </select>
            <select className="form-input" style={{ width: 'auto', marginBottom: 0, padding: '0.5rem 1rem' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">すべての勘定科目</option>
              {currentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {selectedIds.length > 0 && (
              <button 
                className="btn" 
                onClick={handleBulkDelete} 
                style={{ backgroundColor: 'transparent', border: '1px solid var(--danger-color)', color: 'var(--danger-color)' }}
              >
                選択した{selectedIds.length}件を削除
              </button>
            )}
            <button className="btn" onClick={() => { resetForm(); setIsFormOpen(true); }}>
              + 新規追加
            </button>
          </div>
        </div>
        {filteredTx.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>履歴がありません。</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={toggleAll} 
                      checked={filteredTx.length > 0 && selectedIds.length === filteredTx.length}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>日付</th>
                  <th>{type === 'income' ? 'クライアント名' : '品名'}</th>
                  <th>勘定科目</th>
                  <th>決済手段</th>
                  <th>単価 × 個数</th>
                  <th>金額</th>
                  <th>メモ</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map(tx => (
                  <tr key={tx.id} style={{ backgroundColor: selectedIds.includes(tx.id) ? 'var(--bg-surface-hover)' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(tx.id)} 
                        onChange={() => toggleSelection(tx.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>{tx.date}</td>
                    <td style={{ fontWeight: 500 }}>{tx.clientName || tx.itemName || '-'}</td>
                    <td>
                      <span style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {getCategoryName(tx, accounts)}
                      </span>
                    </td>
                    <td>
                      <span style={{ padding: '0.2rem 0.5rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {getPaymentMethodName(tx, accounts)}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {tx.unitPrice && tx.quantity ? `@${tx.unitPrice.toLocaleString()} × ${tx.quantity}` : '-'}
                    </td>
                    <td style={{ fontWeight: 700, color }}>
                      {type === 'income' ? '+' : '-'}¥{tx.amount.toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {tx.memo || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button className="btn-icon" onClick={() => handleEdit(tx)} title="編集">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button className="btn-icon" onClick={() => handleDelete(tx.id)} title="削除">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
