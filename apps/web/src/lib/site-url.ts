// Absolute origin for links that leave this page, like QR codes scanned with
// another phone. Identical on server and client, so it's safe to pre-render.
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://samadyafarm.com'
