import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request) {
  try {
    const rawPath = request.headers.get('x-data-path');
    const dataPath = rawPath ? decodeURIComponent(rawPath) : null;
    if (!dataPath) {
      return NextResponse.json({ error: 'Data path not provided. Please set it in Settings.' }, { status: 400 });
    }

    try {
      const fileData = await fs.readFile(dataPath, 'utf-8');
      return NextResponse.json(JSON.parse(fileData));
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet, return default empty structure
        const defaultData = { transactions: [], categories: ['売上', '交通費', '通信費', '消耗品費', '交際費', 'その他'] };
        return NextResponse.json(defaultData);
      }
      throw error;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rawPath = request.headers.get('x-data-path');
    const dataPath = rawPath ? decodeURIComponent(rawPath) : null;
    if (!dataPath) {
      return NextResponse.json({ error: 'Data path not provided. Please set it in Settings.' }, { status: 400 });
    }

    const body = await request.json();
    
    // Ensure directory exists
    const dir = path.dirname(dataPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(dataPath, JSON.stringify(body, null, 2), 'utf-8');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
