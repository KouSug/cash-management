"use client";

import AccountSettings from '@/components/AccountSettings';

export default function SettingsPage() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.5px' }}>設定</h1>
      <AccountSettings />
    </div>
  );
}
