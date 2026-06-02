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

const DEFAULT_DATA: AppData = { transactions: [], categories: [] };

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('google_access_token');
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

  // Search for data.json inside folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='data.json' and '${folderId}' in parents and trashed=false`,
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
  if (!token) return null; // Requires login

  try {
    const folderId = await getFolderId(token);
    const fileId = await getFileId(token, folderId);

    if (!fileId) {
      return DEFAULT_DATA; // File doesn't exist yet
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
    if (!text) return DEFAULT_DATA;
    
    return JSON.parse(text);
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
  if (!token) return false;

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
          name: 'data.json',
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
