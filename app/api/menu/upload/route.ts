// POST /api/menu/upload
// Accepts a multipart/form-data request with a single 'file' field (image).
// Uploads the image to Supabase Storage bucket 'menu-images' (must be public).
// Returns: { ok: true, url: string } on success
//          { ok: false, error: string } on failure
//
// ⚠️  Prerequisite: Create a PUBLIC bucket named 'menu-images' in your Supabase
//     project → Storage → New bucket → Name: menu-images → Public: true
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const MAX_BYTES     = 5 * 1024 * 1024; // 5 MB
const BUCKET        = 'menu-images';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ ok: false, error: 'Expected multipart/form-data' }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ ok: false, error: 'Only JPEG, PNG, WebP, GIF and AVIF images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'Image must be under 5 MB' }, { status: 413 });
    }

    // Sanitise filename — replace spaces and unsafe chars, keep extension
    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const safeName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const path     = `public/${Date.now()}_${safeName}.${ext}`;

    const buffer   = Buffer.from(await file.arrayBuffer());
    const sb       = getServerClient();

    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error('[POST /api/menu/upload] storage error:', uploadError.message);
      // Common cause: bucket doesn't exist or isn't public
      const hint = uploadError.message.includes('not found')
        ? ' — create a PUBLIC bucket named "menu-images" in Supabase Storage first'
        : '';
      return NextResponse.json({ ok: false, error: uploadError.message + hint }, { status: 500 });
    }

    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, url: urlData.publicUrl });
  } catch (err) {
    console.error('[POST /api/menu/upload] unexpected error:', err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
