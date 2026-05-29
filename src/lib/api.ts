export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  memo: string;
  unitPrice?: number;
  quantity?: number;
  clientName?: string;
  itemName?: string;
}

export interface AppData {
  transactions: Transaction[];
  categories: string[];
}

export async function loadData(): Promise<AppData | null> {
  if (typeof window === 'undefined') return null;
  const dataPath = localStorage.getItem('cashAppDataPath');
  if (!dataPath) return null;

  try {
    const res = await fetch('/api/data', {
      headers: {
        'x-data-path': encodeURIComponent(dataPath)
      }
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch data');
    }
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function saveData(data: AppData): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const dataPath = localStorage.getItem('cashAppDataPath');
  if (!dataPath) return false;

  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'x-data-path': encodeURIComponent(dataPath),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}
