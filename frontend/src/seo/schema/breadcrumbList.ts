/**
 * JSON-LD BreadcrumbList schema for inner pages
 */
export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface BreadcrumbListSchema {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
}

const SITE_URL = 'https://aiworkoutnow.com';

export function buildBreadcrumbListSchema(items: BreadcrumbItem[]): BreadcrumbListSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem' as const,
      position: i + 1,
      name: item.name,
      ...(i < items.length - 1 && { item: `${SITE_URL}${item.path}` }),
    })),
  };
}
