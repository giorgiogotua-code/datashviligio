import { NextRequest, NextResponse } from 'next/server'
import { AwsClient } from 'aws4fetch'
import { createClient } from '@/lib/supabase/server'

// aws4fetch is a tiny, fetch-based SigV4 signer with no Node `fs` dependency,
// so it runs both on Cloudflare Workers (prod) and Node (local dev) and hits
// the same real R2 bucket via the S3 API. The full @aws-sdk/client-s3 cannot
// run on Workers — it calls fs.readFile, which unenv does not implement.

export async function POST(request: NextRequest) {
  try {
    // Only signed-in admins may upload.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // On Cloudflare Workers, secrets are only available per-request.
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucket = process.env.R2_BUCKET_NAME
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      console.error('R2 env missing', {
        hasAccount: !!accountId, hasKey: !!accessKeyId,
        hasSecret: !!secretAccessKey, hasBucket: !!bucket,
      })
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const body = await file.arrayBuffer()

    const client = new AwsClient({ accessKeyId, secretAccessKey, region: 'auto', service: 's3' })
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${filename}`
    const res = await client.fetch(endpoint, {
      method: 'PUT',
      body,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('R2 PUT failed', res.status, text.slice(0, 300))
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${filename}`
    return NextResponse.json({ url: publicUrl })
  } catch (error: any) {
    console.error('R2 Upload Error:', error?.name, error?.message)
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
  }
}
