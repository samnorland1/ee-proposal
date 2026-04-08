import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get raw webhook payloads from database
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('upwork_leads')
      .select('id, created_at, title, vollna_payload')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      count: data?.length || 0,
      leads: data?.map(d => ({
        id: d.id,
        created_at: d.created_at,
        title: d.title,
        payload_keys: d.vollna_payload ? Object.keys(d.vollna_payload) : null
      }))
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
