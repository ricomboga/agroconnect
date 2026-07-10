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

export type ExpertType = 'agronomist' | 'vet' | 'extension_officer' | 'soil_lab';

const CATEGORY_TO_API: Record<ThreadCategory, string> = {
  crops:      'crop_advice',
  livestock:  'livestock_health',
  market:     'market_talk',
  weather:    'weather_climate',
  finance:    'finance_business',
  government: 'government_programs',
  success:    'success_stories',
  tools:      'equipment_tools',
};

const API_TO_CATEGORY: Record<string, ThreadCategory> = Object.fromEntries(
  Object.entries(CATEGORY_TO_API).map(([k, v]) => [v, k as ThreadCategory]),
);

export interface Thread {
  id: string;
  title: string;
  body: string;
  category: ThreadCategory;
  cropTag: string | null;
  cropType: string | null;
  authorId: string;
  authorName: string;
  authorCounty: string | null;
  isExpert: boolean;
  replyCount: number;
  upvotes: number;
  upvoteCount: number;
  createdAt: string;
  photos: string[];
}

export interface Reply {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorRole: string | null;
  isExpert: boolean;
  body: string;
  upvotes: number;
  upvoteCount: number;
  isExpertVerified: boolean;
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
  organisation: string | null;
  licenceNumber: string | null;
  bio: string | null;
  rating: number;
  reviewCount: number;
  phone: string;
  whatsapp: string | null;
}

export type ArticleType = 'news' | 'event' | 'webinar';

export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: ThreadCategory;
  type: ArticleType;
  startsAt: string | null;
  endsAt: string | null;
  joinLink: string | null;
  location: string | null;
  authorName: string;
  publishedAt: string;
}

export interface CreateThreadDto {
  category: ThreadCategory;
  cropTag?: string;
  title: string;
  body: string;
  authorName: string;
  authorCounty?: string;
  photos?: string[];
}

export interface CreateReplyDto {
  body: string;
  authorName: string;
  authorRole?: string;
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

function mapThread(t: Thread & { category: string }): Thread {
  return {
    ...t,
    category: (API_TO_CATEGORY[t.category] ?? t.category) as ThreadCategory,
    upvoteCount: t.upvoteCount ?? t.upvotes ?? 0,
    replyCount: t.replyCount ?? 0,
    photos: t.photos ?? [],
    cropTag: t.cropTag ?? t.cropType ?? null,
  };
}

function mapReply(r: Reply): Reply {
  return {
    ...r,
    upvoteCount: r.upvoteCount ?? r.upvotes ?? 0,
    isVerified: r.isVerified ?? r.isExpertVerified ?? false,
    isExpert: r.isExpert ?? r.isExpertVerified ?? false,
  };
}

export const communityApi = {
  threads: {
    list: async (params?: {
      category?: ThreadCategory;
      crop?: string;
      county?: string;
      sort?: 'newest' | 'top';
      page?: number;
    }) => {
      const apiCategory = params?.category ? CATEGORY_TO_API[params.category] : undefined;
      const res = await apiFetch<{ data: Thread[]; meta: ListMeta }>(
        `/community/threads${buildQs({
          category: apiCategory,
          cropType: params?.crop,
          county: params?.county,
          sort: params?.sort,
          page: params?.page,
        })}`,
      );
      return { ...res, data: res.data.map(mapThread) };
    },

    get: async (id: string) => {
      const res = await apiFetch<{ data: { thread: Thread; replies: Reply[] } }>(
        `/community/threads/${id}`,
      );
      return {
        data: {
          thread: mapThread(res.data.thread),
          replies: res.data.replies.map(mapReply),
        },
      };
    },

    create: (dto: CreateThreadDto) =>
      apiFetch<{ data: Thread }>('/community/threads', {
        method: 'POST',
        body: JSON.stringify({
          authorName: dto.authorName,
          authorCounty: dto.authorCounty,
          category: CATEGORY_TO_API[dto.category],
          cropType: dto.cropTag,
          title: dto.title,
          body: dto.body,
          photos: dto.photos ?? [],
        }),
      }),

    update: (id: string, dto: Partial<Pick<CreateThreadDto, 'title' | 'body' | 'photos'>>) =>
      apiFetch<{ data: Thread }>(`/community/threads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),

    delete: (id: string) =>
      apiFetch<void>(`/community/threads/${id}`, { method: 'DELETE' }),

    reply: (id: string, dto: CreateReplyDto) =>
      apiFetch<{ data: Reply }>(`/community/threads/${id}/replies`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    upvote: (id: string) =>
      apiFetch<{ data: Thread }>(`/community/threads/${id}/upvote`, { method: 'POST' }),
  },

  replies: {
    upvote: (id: string) =>
      apiFetch<{ data: Reply }>(`/community/replies/${id}/upvote`, { method: 'POST' }),
    verify: (id: string) =>
      apiFetch<void>(`/community/replies/${id}/verify`, { method: 'POST' }),
    report: (id: string, reason?: string) =>
      apiFetch<void>(`/community/replies/${id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    delete: (id: string) =>
      apiFetch<void>(`/community/replies/${id}`, { method: 'DELETE' }),
  },

  experts: {
    list: (params?: { county?: string; subCounty?: string; providerType?: ExpertType; page?: number }) =>
      apiFetch<{ data: Expert[]; meta: ListMeta & { matched_on: 'subCounty' | 'county' | 'region' | null } }>(
        `/community/experts${buildQs({
          county: params?.county,
          subCounty: params?.subCounty,
          providerType: params?.providerType,
          page: params?.page,
        })}`,
      ),
    get: (id: string) => apiFetch<{ data: Expert }>(`/community/experts/${id}`),
  },

  articles: {
    list: (params?: { category?: ThreadCategory; type?: ArticleType; page?: number }) => {
      const apiCategory = params?.category ? CATEGORY_TO_API[params.category] : undefined;
      return apiFetch<{ data: Article[]; meta: ListMeta }>(
        `/community/articles${buildQs({ category: apiCategory, type: params?.type, page: params?.page })}`,
      );
    },
    get: (slug: string) => apiFetch<{ data: Article }>(`/community/articles/${slug}`),
  },
};
