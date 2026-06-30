"use client";

import { useState } from 'react';
import { loadData } from '@/lib/api';

export default function DataExport() {
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const data = await loadData();
      if (!data || data.transactions.length === 0) {
        alert('出力するデータがありません。');
        setExporting(false);
        return;
      }

      // ヘッダー行
      const headers = ['日付', '借方勘定科目', '借方金額', '貸方勘定科目', '貸方金額', '摘要'];
      
      // データ行の作成（日付順にソート）
      const sortedTx = [...data.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || Number(a.id) - Number(b.id));
      
      const rows = sortedTx.map(tx => {
        const debitAcc = data.accounts.find(a => a.id === tx.debitAccountId)?.name || '不明';
        const creditAcc = data.accounts.find(a => a.id === tx.creditAccountId)?.name || '不明';
        
        const memoText = [tx.clientName || tx.itemName, tx.memo].filter(Boolean).join(' / ');
        
        // CSVエスケープ処理（カンマやダブルクォーテーションを含む場合）
        const escapeCsv = (str: string) => {
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        return [
          tx.date,
          escapeCsv(debitAcc),
          tx.amount.toString(),
          escapeCsv(creditAcc),
          tx.amount.toString(),
          escapeCsv(memoText)
        ].join(',');
      });

      // Excel(Windows)の文字化け対策としてBOM (Byte Order Mark) を付与
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const csvContent = [headers.join(','), ...rows].join('\n');
      
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `cashflow_journal_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました。');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>データのエクスポート</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        登録されたすべての取引データ（仕訳帳）をCSV形式（Excel対応）でダウンロードできます。
        税理士への提出や、他の会計ソフトへの取り込みに利用できます。
      </p>
      <button 
        className="btn" 
        onClick={handleExportCSV} 
        disabled={exporting}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        {exporting ? '出力中...' : '全取引データをCSVで出力 (Excel用)'}
      </button>
    </div>
  );
}
