import { apiFetch } from './client';

export type ThreadCategory =
  | 'crops'
  | 'livestock'
  | 'market'
  | 'weather'
  | 'finance'
  | 'government'
  | 'success'
  | 'tools';

export type ExpertType = 'agronomist' | 'vet' | 'extension_officer';

export interface Thread {
  id: string;
  title: string;
  body: string;
  category: ThreadCategory;
  cropTag: string | null;
  authorId: string;
  authorName: string;
  isExpert: boolean;
  replyCount: number;
  upvoteCount: number;
  createdAt: string;
}

export interface Reply {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  isExpert: boolean;
  body: string;
  upvoteCount: number;
  isVerified: boolean;
  createdAt: string;
}

export interface Expert {
  id: string;
  name: string;
  photoUrl: string | null;
  providerType: ExpertType;
  specialisations: string[];
  countiesServed: string[];
  rating: number;
  reviewCount: number;
  phone: string;
  whatsapp: string | null;
}

export interface CreateThreadDto {
  category: ThreadCategory;
  cropTag?: string;
  title: string;
  body: string;
}

interface ListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function buildQs(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export interface Article {
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: ThreadCategory;
  authorName: string;
  publishedAt: string;
}

export const communityApi = {
  threads: {
    list: (params?: { category?: ThreadCategory; crop?: string; page?: number }) =>
      apiFetch<{ data: Thread[]; meta: ListMeta }>(
        `/community/threads${buildQs({ category: params?.category, crop: params?.crop, page: params?.page })}`
      ),
    get: (id: string) =>
      apiFetch<{ data: { thread: Thread; replies: Reply[] } }>(`/community/threads/${id}`),
    create: (dto: CreateThreadDto) =>
      apiFetch<{ data: Thread }>('/community/threads', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    delete: (id: string) =>
      apiFetch<void>(`/community/threads/${id}`, { method: 'DELETE' }),
    reply: (id: string, body: string) =>
      apiFetch<{ data: Reply }>(`/community/threads/${id}/replies`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    upvote: (id: string) =>
      apiFetch<void>(`/community/threads/${id}/upvote`, { method: 'POST' }),
  },
  replies: {
    upvote: (id: string) =>
      apiFetch<void>(`/community/replies/${id}/upvote`, { method: 'POST' }),
    verify: (id: string) =>
      apiFetch<void>(`/community/replies/${id}/verify`, { method: 'POST' }),
    report: (id: string, reason: string) =>
      apiFetch<void>(`/community/replies/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },
  experts: {
    list: () => apiFetch<{ data: Expert[] }>('/community/experts'),
  },
  articles: {
    list: () => apiFetch<{ data: Article[] }>('/community/articles'),
    get: (slug: string) => apiFetch<{ data: Article }>(`/community/articles/${slug}`),
  },
};
