export type SearchEntityType =
  | 'task'
  | 'daily_update'
  | 'user'
  | 'department'
  | 'role'
  | 'audit_log'
  | 'notification';

export interface SearchResultItem {
  id: string;
  entity_type: SearchEntityType;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  badge_color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet' | string | null;
  url?: string | null;
  created_at?: string | null;
}

export interface GlobalSearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
  categories: Record<string, SearchResultItem[]>;
}
