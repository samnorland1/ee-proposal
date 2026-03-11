import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'screenshots');
const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp)$/i;

export async function GET() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    return NextResponse.json({ folders: [] });
  }

  const folders = fs
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

  return NextResponse.json({ folders });
}
