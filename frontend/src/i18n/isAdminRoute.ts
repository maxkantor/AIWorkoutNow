export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

