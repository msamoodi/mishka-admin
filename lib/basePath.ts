export const BASE_PATH = "/admin"

export function withBasePath(path: string) {
  return `${BASE_PATH}${path}`
}
