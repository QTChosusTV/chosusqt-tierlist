import { Suspense } from 'react';
import HistoryList from '@/components/history/HistoryList';

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0e]">
      <Suspense fallback={
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: 100, fontSize: 16 }}>
          Loading...
        </div>
      }>
        <HistoryList />
      </Suspense>
    </main>
  );
}