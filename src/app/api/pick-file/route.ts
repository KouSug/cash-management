import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function GET() {
  const psCommand = `
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    Add-Type -AssemblyName System.Windows.Forms
    $f = New-Object System.Windows.Forms.SaveFileDialog
    $f.Filter = 'JSON Files (*.json)|*.json|All Files (*.*)|*.*'
    $f.Title = 'データ保存先を選択（または新しいファイル名を入力）'
    $f.ShowHelp = $true
    $res = $f.ShowDialog()
    if ($res -eq 'OK') {
        Write-Output $f.FileName
    }
  `;
  
  try {
    const { stdout } = await execAsync(`powershell -Sta -Command "${psCommand.replace(/\n/g, ';')}"`);
    const path = stdout.trim();
    return NextResponse.json({ path });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to open dialog' }, { status: 500 });
  }
}
