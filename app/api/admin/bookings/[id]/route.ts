import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase.server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Verify authenticated session
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await request.json();
  const { action, new_site_id } = body as {
    action: 'approve' | 'decline' | 'reassign';
    new_site_id?: string;
  };

  const db = createServiceRoleClient();

  if (action === 'approve') {
    const { data, error } = await db
      .from('bookings')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === 'decline') {
    const { data, error } = await db
      .from('bookings')
      .update({ status: 'declined' })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (action === 'reassign') {
    if (!new_site_id) {
      return NextResponse.json(
        { error: 'new_site_id required for reassign' },
        { status: 400 },
      );
    }
    const { data, error } = await db
      .from('bookings')
      .update({ site_id: new_site_id })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
