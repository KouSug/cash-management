"use client";

import { useState } from 'react';
import { loadData, isIncome, isExpense, getCategoryName } from '@/lib/api';
import * as XLSX from 'xlsx';

export default function DataExport() {
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const data = await loadData();
      if (!data || data.transactions.length === 0) {
        alert('出力するデータがありません。');
        setExporting(false);
        return;
      }

      const wb = XLSX.utils.book_new();
      const accounts = data.accounts;
      
      // --- 1. 仕訳帳 (Journal) ---
      const sortedTx = [...data.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || Number(a.id) - Number(b.id));
      const journalData = sortedTx.map(tx => {
        const debitAcc = accounts.find(a => a.id === tx.debitAccountId)?.name || '不明';
        const creditAcc = accounts.find(a => a.id === tx.creditAccountId)?.name || '不明';
        const memoText = [tx.clientName || tx.itemName, tx.memo].filter(Boolean).join(' / ');
        return {
          '日付': tx.date,
          '借方勘定科目': debitAcc,
          '借方金額': tx.amount,
          '貸方勘定科目': creditAcc,
          '貸方金額': tx.amount,
          '摘要': memoText
        };
      });
      const wsJournal = XLSX.utils.json_to_sheet(journalData);
      XLSX.utils.book_append_sheet(wb, wsJournal, '仕訳帳');

      // --- 2. 月別サマリー (Monthly Summary) ---
      const monthlyData: Record<string, { income: number, expense: number }> = {};
      sortedTx.forEach(tx => {
        const month = tx.date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 };
        if (isIncome(tx, accounts)) monthlyData[month].income += tx.amount;
        if (isExpense(tx, accounts)) monthlyData[month].expense += tx.amount;
      });
      
      const summaryRows = Object.keys(monthlyData).sort().map(month => ({
        '年月': month,
        '収入': monthlyData[month].income,
        '支出': monthlyData[month].expense,
        '利益': monthlyData[month].income - monthlyData[month].expense
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, '月別サマリー');

      // --- 3. 科目別集計 (Category Summary) ---
      const catData: Record<string, Record<string, number>> = {};
      sortedTx.forEach(tx => {
        if (isIncome(tx, accounts) || isExpense(tx, accounts)) {
          const type = isIncome(tx, accounts) ? '収入' : '支出';
          const catName = getCategoryName(tx, accounts);
          const key = `${type} - ${catName}`;
          if (!catData[key]) catData[key] = {};
          const month = tx.date.substring(0, 7);
          if (!catData[key][month]) catData[key][month] = 0;
          catData[key][month] += tx.amount;
        }
      });
      
      const allMonths = Object.keys(monthlyData).sort();
      const catRows = Object.keys(catData).sort().map(key => {
        const row: any = { '区分・勘定科目': key };
        let total = 0;
        allMonths.forEach(m => {
          const val = catData[key][m] || 0;
          row[m] = val;
          total += val;
        });
        row['合計'] = total;
        return row;
      });
      const wsCat = XLSX.utils.json_to_sheet(catRows);
      XLSX.utils.book_append_sheet(wb, wsCat, '科目別集計');

      // --- 4. 総勘定元帳 (Ledger) ---
      const ledgerRows: any[] = [];
      accounts.forEach(acc => {
        const accTx = sortedTx.filter(tx => tx.debitAccountId === acc.id || tx.creditAccountId === acc.id);
        if (accTx.length === 0) return; // Skip unused accounts
        
        let runningBalance = 0;
        const isDebitIncrease = acc.type === 'asset' || acc.type === 'expense';
        
        // Add header row for account
        ledgerRows.push({
          '勘定科目': `【${acc.name}】`,
          '日付': '',
          '相手勘定': '',
          '摘要': '',
          '借方': null,
          '貸方': null,
          '残高': null
        });

        accTx.forEach(tx => {
          const isDebit = tx.debitAccountId === acc.id;
          const counterpartId = isDebit ? tx.creditAccountId : tx.debitAccountId;
          const counterpartName = accounts.find(a => a.id === counterpartId)?.name || '不明';
          
          if (isDebit) {
            runningBalance += isDebitIncrease ? tx.amount : -tx.amount;
          } else {
            runningBalance += isDebitIncrease ? -tx.amount : tx.amount;
          }

          const memoText = [tx.clientName || tx.itemName, tx.memo].filter(Boolean).join(' / ');

          ledgerRows.push({
            '勘定科目': acc.name,
            '日付': tx.date,
            '相手勘定': counterpartName,
            '摘要': memoText,
            '借方': isDebit ? tx.amount : null,
            '貸方': !isDebit ? tx.amount : null,
            '残高': runningBalance
          });
        });
        
        // Add empty row separator
        ledgerRows.push({});
      });

      const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
      XLSX.utils.book_append_sheet(wb, wsLedger, '総勘定元帳');

      // Excelファイルのダウンロード
      XLSX.writeFile(wb, `cashflow_data_${new Date().toISOString().split('T')[0]}.xlsx`);
      
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
        登録された全データ（仕訳帳、月別サマリー、総勘定元帳など）を複数のシートに分けた1つのExcelファイル（.xlsx）としてダウンロードします。
      </p>
      <button 
        className="btn" 
        onClick={handleExportExcel} 
        disabled={exporting}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        {exporting ? '出力中...' : 'すべてのデータをExcelでダウンロード'}
      </button>
    </div>
  );
}
