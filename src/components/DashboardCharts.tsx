"use client";

import { useMemo } from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AppData } from '@/lib/api';

const INCOME_COLORS = ['#10b981', '#059669', '#047857', '#34d399', '#6ee7b7'];
const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#8b5cf6', '#d946ef', '#f43f5e', '#dc2626', '#ea580c', '#d97706'];

export default function DashboardCharts({ data }: { data: AppData }) {
  const { incomeData, expenseData, balanceData, incomeCategories, expenseCategories } = useMemo(() => {
    const iData: Record<string, any> = {};
    const eData: Record<string, any> = {};
    const bData: Record<string, any> = {};
    const iCategories = new Set<string>();
    const eCategories = new Set<string>();

    data.transactions.forEach(tx => {
      const month = tx.date.substring(0, 7); // YYYY-MM
      
      if (!bData[month]) bData[month] = { month, 収支: 0 };

      if (tx.type === 'income') {
        if (!iData[month]) iData[month] = { month };
        iData[month][tx.category] = (iData[month][tx.category] || 0) + tx.amount;
        iCategories.add(tx.category);
        bData[month].収支 += tx.amount;
      } else {
        if (!eData[month]) eData[month] = { month };
        eData[month][tx.category] = (eData[month][tx.category] || 0) + tx.amount;
        eCategories.add(tx.category);
        bData[month].収支 -= tx.amount;
      }
    });

    const sortedIncomeData = Object.values(iData).sort((a, b) => a.month.localeCompare(b.month));
    const sortedExpenseData = Object.values(eData).sort((a, b) => a.month.localeCompare(b.month));
    const sortedBalanceData = Object.values(bData).sort((a, b) => a.month.localeCompare(b.month));

    return {
      incomeData: sortedIncomeData,
      expenseData: sortedExpenseData,
      balanceData: sortedBalanceData,
      incomeCategories: Array.from(iCategories),
      expenseCategories: Array.from(eCategories),
    };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isBalance = payload.length === 1 && payload[0].dataKey === '収支';
      const total = isBalance ? payload[0].value : payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{label.replace('-', '年')}月</p>
          {!isBalance && payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', color: entry.color, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              <span>{entry.name}</span>
              <span style={{ fontWeight: 600 }}>¥{entry.value.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ marginTop: isBalance ? '0' : '0.5rem', paddingTop: isBalance ? '0' : '0.5rem', borderTop: isBalance ? 'none' : '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: '2rem', fontWeight: 'bold' }}>
            <span>{isBalance ? '収支' : '合計'}</span>
            <span style={{ color: isBalance ? (total >= 0 ? 'var(--success-color)' : 'var(--danger-color)') : 'inherit' }}>
              {total > 0 && isBalance ? '+' : ''}¥{total.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
      {/* Income Chart */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--success-color)' }}>収入推移 (月別・カテゴリ別)</h2>
        <div style={{ height: '350px', width: '100%' }}>
          {incomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tickFormatter={(val) => val.substring(5) + '月'} tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-secondary)" tickFormatter={(val) => `¥${val.toLocaleString()}`} tick={{ fontSize: 12 }} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '0.875rem' }} />
                {incomeCategories.map((category, index) => (
                  <Bar key={category} dataKey={category} stackId="a" fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>データがありません</div>
          )}
        </div>
      </div>

      {/* Expense Chart */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--danger-color)' }}>支出推移 (月別・カテゴリ別)</h2>
        <div style={{ height: '350px', width: '100%' }}>
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tickFormatter={(val) => val.substring(5) + '月'} tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-secondary)" tickFormatter={(val) => `¥${val.toLocaleString()}`} tick={{ fontSize: 12 }} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '0.875rem' }} />
                {expenseCategories.map((category, index) => (
                  <Bar key={category} dataKey={category} stackId="a" fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>データがありません</div>
          )}
        </div>
      </div>

      {/* Balance Chart */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>月別収支推移 (利益・赤字)</h2>
        <div style={{ height: '350px', width: '100%' }}>
          {balanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balanceData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <ReferenceLine y={0} stroke="var(--border-color)" strokeWidth={2} />
                <XAxis dataKey="month" stroke="var(--text-secondary)" tickFormatter={(val) => val.substring(5) + '月'} tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-secondary)" tickFormatter={(val) => `¥${val.toLocaleString()}`} tick={{ fontSize: 12 }} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                <Bar dataKey="収支">
                  {balanceData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.収支 >= 0 ? 'var(--success-color)' : 'var(--danger-color)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>データがありません</div>
          )}
        </div>
      </div>
    </div>
  );
}
