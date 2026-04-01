import { NextResponse } from 'next/server';
import { getUniqueCountries, getUniqueSources } from '@/lib/clients';

export async function GET() {
  try {
    const [countries, sources] = await Promise.all([
      getUniqueCountries(),
      getUniqueSources(),
    ]);
    return NextResponse.json({ countries, sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch options';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
