export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  isSystem?: boolean;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  memo: string;
  unitPrice?: number;
  quantity?: number;
  clientName?: string;
  itemName?: string;
}

export interface AppData {
  transactions: Transaction[];
  accounts: Account[];
}

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'a_cash', name: '現金', type: 'asset', isSystem: true },
  { id: 'a_bank', name: '普通預金', type: 'asset', isSystem: true },
  { id: 'a_ar', name: '売掛金', type: 'asset', isSystem: true },
  { id: 'l_card', name: 'クレジットカード', type: 'liability', isSystem: true },
  { id: 'l_ap', name: '買掛金', type: 'liability', isSystem: true },
  { id: 'eq_capital', name: '元入金', type: 'equity', isSystem: true },
  { id: 'eq_owner_draw', name: '事業主貸', type: 'equity', isSystem: true },
  { id: 'eq_owner_cont', name: '事業主借', type: 'equity', isSystem: true },
  { id: 'r_sales', name: '売上高', type: 'revenue', isSystem: true },
  { id: 'r_other', name: '雑収入', type: 'revenue', isSystem: true },
  { id: 'e_supplies', name: '消耗品費', type: 'expense', isSystem: true },
  { id: 'e_fee', name: '支払手数料', type: 'expense', isSystem: true },
  { id: 'e_travel', name: '旅費交通費', type: 'expense', isSystem: true },
  { id: 'e_comm', name: '通信費', type: 'expense', isSystem: true },
  { id: 'e_util', name: '水道光熱費', type: 'expense', isSystem: true },
  { id: 'e_rent', name: '地代家賃', type: 'expense', isSystem: true },
  { id: 'e_ent', name: '接待交際費', type: 'expense', isSystem: true },
  { id: 'e_misc', name: '雑費', type: 'expense', isSystem: true },
];

const DEFAULT_DATA: AppData = { transactions: [], accounts: [...DEFAULT_ACCOUNTS] };

export function migrateData(data: any): AppData {
  if (!data || !data.transactions) return DEFAULT_DATA;
  if (data.accounts && (data.transactions.length === 0 || data.transactions[0].debitAccountId)) {
    return data as AppData;
  }
  const accounts = [...DEFAULT_ACCOUNTS];
  const categoryToAccountId: Record<string, string> = {};
  if (data.categories) {
    data.categories.forEach((cat: string) => {
      const existing = accounts.find(a => a.name === cat);
      if (existing) {
        categoryToAccountId[cat] = existing.id;
      } else {
        const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
        accounts.push({ id: newId, name: cat, type: 'expense', isSystem: false });
        categoryToAccountId[cat] = newId;
      }
    });
  }
  const newTransactions: Transaction[] = data.transactions.map((t: any) => {
    if (t.debitAccountId && t.creditAccountId) {
      return t;
    }
    
    let debitId = '';
    let creditId = '';
    if (t.type === 'income') {
      const acc = accounts.find(a => a.name === t.category);
      if (acc && acc.type === 'expense') acc.type = 'revenue';
      else if (!acc) {
        const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
        accounts.push({ id: newId, name: t.category, type: 'revenue', isSystem: false });
        categoryToAccountId[t.category] = newId;
      }
    }
    const catId = categoryToAccountId[t.category] || (t.type === 'income' ? 'r_sales' : 'e_misc');
    if (t.type === 'income') {
      debitId = 'a_bank';
      creditId = catId;
    } else {
      debitId = catId;
      creditId = 'a_cash';
    }
    return {
      id: t.id,
      date: t.date,
      debitAccountId: debitId,
      creditAccountId: creditId,
      amount: t.amount,
      memo: t.memo || '',
      unitPrice: t.unitPrice,
      quantity: t.quantity,
      clientName: t.clientName,
      itemName: t.itemName
    };
  });
  return { transactions: newTransactions, accounts };
}

export function isIncome(tx: Transaction, accounts: Account[]): boolean {
  const creditAcc = accounts.find(a => a.id === tx.creditAccountId);
  return creditAcc?.type === 'revenue';
}

export function isExpense(tx: Transaction, accounts: Account[]): boolean {
  const debitAcc = accounts.find(a => a.id === tx.debitAccountId);
  return debitAcc?.type === 'expense';
}

export function getCategoryName(tx: Transaction, accounts: Account[]): string {
  if (isIncome(tx, accounts)) {
    return accounts.find(a => a.id === tx.creditAccountId)?.name || '不明';
  } else if (isExpense(tx, accounts)) {
    return accounts.find(a => a.id === tx.debitAccountId)?.name || '不明';
  }
  return '振替';
}

export function getPaymentMethodName(tx: Transaction, accounts: Account[]): string {
  if (isIncome(tx, accounts)) {
    return accounts.find(a => a.id === tx.debitAccountId)?.name || '不明';
  } else if (isExpense(tx, accounts)) {
    return accounts.find(a => a.id === tx.creditAccountId)?.name || '不明';
  }
  return '不明';
}

function getToken() {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  if (urlToken) {
    localStorage.setItem('google_access_token', urlToken);
    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({path: newUrl}, '', newUrl);
    return urlToken;
  }

  return localStorage.getItem('google_access_token');
}

function isTrialMode() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('trial_mode') === 'true';
}

async function getFolderId(token: string): Promise<string> {
  let folderId = localStorage.getItem('google_folder_id');
  if (folderId) return folderId;

  // Search for ApplicationData folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='ApplicationData' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (searchRes.status === 401) {
    localStorage.removeItem('google_access_token');
    throw new Error('Unauthorized');
  }
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    folderId = searchData.files[0].id;
  } else {
    // Create ApplicationData folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'ApplicationData',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const createData = await createRes.json();
    folderId = createData.id;
  }

  if (folderId) {
    localStorage.setItem('google_folder_id', folderId);
  }
  return folderId as string;
}

async function getFileId(token: string, folderId: string): Promise<string | null> {
  let fileId = localStorage.getItem('google_file_id');
  if (fileId) return fileId;

  // Search for cashflowData.json inside folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='cashflowData.json' and '${folderId}' in parents and trashed=false`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    fileId = searchData.files[0].id;
    localStorage.setItem('google_file_id', fileId as string);
    return fileId;
  }
  return null;
}

export async function loadData(): Promise<AppData | null> {
  const token = getToken();
  if (!token) {
    if (isTrialMode()) {
      const trialData = sessionStorage.getItem('trial_data');
      return trialData ? migrateData(JSON.parse(trialData)) : DEFAULT_DATA;
    }
    return null; // Requires login
  }

  try {
    const folderId = await getFolderId(token);
    const fileId = await getFileId(token, folderId);

    if (!fileId) {
      let finalData = DEFAULT_DATA;
      if (isTrialMode()) {
        const trialDataStr = sessionStorage.getItem('trial_data');
        if (trialDataStr) {
          finalData = migrateData(JSON.parse(trialDataStr));
          saveData(finalData); // Save the trial data to Google Drive
        }
        sessionStorage.removeItem('trial_mode');
        sessionStorage.removeItem('trial_data');
      }
      return finalData; // File doesn't exist yet
    }

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (res.status === 404) {
      // File was deleted
      localStorage.removeItem('google_file_id');
      return DEFAULT_DATA;
    }

    if (!res.ok) throw new Error('Failed to fetch data');
    const text = await res.text();
    const finalData: AppData = text ? migrateData(JSON.parse(text)) : DEFAULT_DATA;
    
    // Merge trial data if transitioning from trial mode
    if (isTrialMode()) {
      const trialDataStr = sessionStorage.getItem('trial_data');
      if (trialDataStr) {
        const trialData: AppData = migrateData(JSON.parse(trialDataStr));
        const existingIds = new Set(finalData.transactions.map(t => t.id));
        const newTransactions = trialData.transactions.filter(t => !existingIds.has(t.id));
        
        finalData.transactions = [...finalData.transactions, ...newTransactions];
        
        const existingAccountIds = new Set(finalData.accounts.map(a => a.id));
        const newAccounts = trialData.accounts.filter(a => !existingAccountIds.has(a.id));
        finalData.accounts = [...finalData.accounts, ...newAccounts];
        
        saveData(finalData); // Save merged data back to Google Drive
      }
      sessionStorage.removeItem('trial_mode');
      sessionStorage.removeItem('trial_data');
    }

    return finalData;
  } catch (error) {
    console.error('Error loading data:', error);
    if ((error as Error).message === 'Unauthorized') {
      window.location.href = '/settings';
    }
    return null;
  }
}

export async function saveData(data: AppData): Promise<boolean> {
  const token = getToken();
  if (!token) {
    if (isTrialMode()) {
      sessionStorage.setItem('trial_data', JSON.stringify(data));
      return true;
    }
    return false;
  }

  try {
    const folderId = await getFolderId(token);
    let fileId = await getFileId(token, folderId);

    if (!fileId) {
      // Create metadata first
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'cashflowData.json',
          parents: [folderId],
        }),
      });
      const createData = await createRes.json();
      fileId = createData.id;
      localStorage.setItem('google_file_id', fileId as string);
    }

    // Update content
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
    
    return res.ok;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}
