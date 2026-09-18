import imageCompression from 'browser-image-compression'

// Phone photos are often 3-8MB / 4000px+. Shrinking them before upload keeps
// Drive storage small and the public site fast. This has to run in the
// browser: the library relies on canvas APIs the API routes don't have.
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8,
}

/**
 * Returns a compressed JPEG copy of a photo - or the original file for
 * videos, animated GIFs, or when compression fails or doesn't make it smaller.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  try {
    const compressed = await imageCompression(file, COMPRESSION_OPTIONS)
    if (compressed.size >= file.size) return file

    const name = `${file.name.replace(/\.[^.]+$/, '')}.jpg`
    return new File([compressed], name, { type: 'image/jpeg' })
  } catch (error) {
    console.warn('[compressImageForUpload] Compression failed, uploading original:', error)
    return file
  }
}
