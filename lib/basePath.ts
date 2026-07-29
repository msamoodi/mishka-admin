export const BASE_PATH = ""

export function withBasePath(path: string) {
  return `${BASE_PATH}${path}`
}

// mishka-app's live domain (including its own basePath). Used to resolve
// mishka-app-relative paths like "/images/avatars/avatar-1.png" into real,
// publicly fetchable URLs — these are static files in mishka-app's own
// deployment, not something mishka-admin's filesystem has access to.
// Full URLs (Supabase Storage, Google avatars, etc.) pass through unchanged.
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? "https://app.mishkaapp.com"

export function resolveAppUrl(path: string) {
  if (path.startsWith("http")) return path
  return `${APP_DOMAIN}${path}`
}
