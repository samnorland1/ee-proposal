import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'screenshots');
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp)$/i;

function getFilesystemFolders(): { name: string; files: string[] }[] {
  if (!fs.existsSync(SCREENSHOTS_DIR)) return [];
  return fs
    .readdirSync(SCREENSHOTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const files = fs
        .readdirSync(path.join(SCREENSHOTS_DIR, d.name))
        .filter((f) => IMAGE_EXTENSIONS.test(f))
        .sort()
        .map((f) => `screenshots/${d.name}/${f}`);
      return { name: d.name, files };
    })
    .filter((f) => f.files.length > 0);
}

async function getSupabaseFolders(): Promise<{ name: string; files: string[] }[]> {
  try {
    const { data: rootItems, error } = await supabase.storage
      .from('screenshots')
      .list('', { limit: 100 });
    if (error || !rootItems) return [];

    // Items with id === null are virtual folders
    const folderNames = rootItems
      .filter((item) => item.id === null)
      .map((item) => item.name);

    const results: { name: string; files: string[] }[] = [];

    for (const folderName of folderNames) {
      const { data: files } = await supabase.storage
        .from('screenshots')
        .list(folderName, { limit: 200 });
      if (!files) continue;

      const imageFiles = files.filter((f) => IMAGE_EXTENSIONS.test(f.name));
      if (imageFiles.length === 0) continue;

      const publicFiles = imageFiles.map((f) => {
        const {
          data: { publicUrl },
        } = supabase.storage.from('screenshots').getPublicUrl(`${folderName}/${f.name}`);
        return publicUrl;
      });

      results.push({ name: folderName, files: publicFiles });
    }

    return results;
  } catch {
    return [];
  }
}

export async function GET() {
  const [fsFolders, supabaseFolders] = await Promise.all([
    Promise.resolve(getFilesystemFolders()),
    getSupabaseFolders(),
  ]);

  // Merge by folder name
  const folderMap = new Map<string, string[]>();
  for (const folder of fsFolders) folderMap.set(folder.name, [...folder.files]);
  for (const folder of supabaseFolders) {
    const existing = folderMap.get(folder.name) ?? [];
    folderMap.set(folder.name, [...existing, ...folder.files]);
  }

  const folders = Array.from(folderMap.entries())
    .map(([name, files]) => ({ name, files }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ folders });
}
