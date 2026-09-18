import { NextRequest, NextResponse } from 'next/server'
import { uploadToGoogleDrive, validateGoogleDriveConfig } from '@/lib/storage/google-drive-oauth'
import { getCurrentAdmin } from '@/lib/auth/jwt'

export const dynamic = 'force-dynamic'

// Map folder names to drive folder types
const FOLDER_MAPPING: Record<string, 'image' | 'video'> = {
  'cattle': 'image',
  'media': 'image',
  'profile': 'image',
  'image': 'image',
  'video': 'video',
  'video-upload': 'video',
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // First validate configuration
    try {
      validateGoogleDriveConfig()
    } catch (configError: any) {
      console.error('[Upload API] Configuration error:', configError.message)
      return NextResponse.json(
        { error: configError.message },
        { status: 500 }
      )
    }

    // Note: Token refresh happens automatically in uploadToGoogleDrive()
    // If token is expired, it will be refreshed automatically

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = formData.get('folder') as string || 'image'

    if (!file) {
      return NextResponse.json(
        { error: 'File tidak ditemukan' },
        { status: 400 }
      )
    }

    // Validate file has type
    if (!file.type || typeof file.type !== 'string') {
      return NextResponse.json(
        { error: 'File type tidak valid atau missing' },
        { status: 400 }
      )
    }

    // Determine file category based on type
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')

    console.log('[Upload API] File info:', {
      name: file.name,
      type: file.type,
      size: file.size,
      isVideo,
      isImage
    })

    // Validate file type
    if (isImage) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.' },
          { status: 400 }
        )
      }
    } else if (!isVideo) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan JPG, PNG, atau MP4.' },
        { status: 400 }
      )
    }

    // Validate file size (500MB for videos, 20MB for images)
    const maxSize = isVideo ? 500 * 1024 * 1024 : 20 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Ukuran file terlalu besar. Maksimal ${isVideo ? '500MB' : '20MB'}.` },
        { status: 400 }
      )
    }

    // Map folder to drive folder type
    const driveFolder = FOLDER_MAPPING[folder] || 'image'

    console.log('[Upload API] Processing file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      folder,
      driveFolder,
    })

    // Photos are compressed in the browser before they're sent (see
    // lib/utils/compressImage) - the compression library needs canvas APIs
    // that don't exist in this Node runtime, so it can't run here
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Google Drive
    const result = await uploadToGoogleDrive(buffer, file.name, file.type, driveFolder)

    console.log('[Upload API] Success:', result)

    // For videos, use streaming proxy to bypass CORS/ORB blocking
    // For images, use direct Google Drive URL
    let publicUrl: string
    if (isVideo) {
      publicUrl = `/api/stream?fileId=${result.fileId}&mimeType=${encodeURIComponent(file.type)}`
    } else {
      publicUrl = result.directUrl || `https://drive.google.com/uc?export=view&id=${result.fileId}`
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
      thumbnailUrl: result.thumbnailLink,
      mimeType: file.type,
      ...(result.isPublic ? {} : { warning: 'File berhasil diupload tetapi gagal dibuat publik, URL mungkin tidak bisa diakses.' }),
    })
  } catch (error: any) {
    console.error('[Upload API] Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    })

    // Return clearer error message
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat mengupload file' },
      { status: 500 }
    )
  }
}
