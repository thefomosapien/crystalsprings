import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: guest } = await supabase
    .from('guests')
    .select('name, phone')
    .eq('email', email.trim().toLowerCase())
    .single();

  if (!guest) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  return NextResponse.json({
    found: true,
    name: guest.name,
    phone: guest.phone,
  });
}
