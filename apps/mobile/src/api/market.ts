import { apiFetch } from './client';

export type QualityGrade = 'A' | 'B' | 'C';
export type ProductCategory = 'seeds' | 'fertilisers' | 'pesticides' | 'equipment' | 'other';
export type ListingStatus = 'active' | 'sold' | 'withdrawn';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ProduceListing {
  id: string;
  crop: string;
  variety: string | null;
  quantityKg: number;
  pricePerKg: number;
  qualityGrade: QualityGrade | null;
  county: string;
  availableFrom: string;
  availableTo: string | null;
  description: string | null;
  photoUrls: string[];
  farmerName: string;
  farmerId: string;
  farmId: string | null;
  harvestId: string | null;
  status: ListingStatus;
  createdAt: string;
}

export interface SupplierProduct {
  id: string;
  name: string;
  brand: string | null;
  category: ProductCategory;
  pricePerUnit: number;
  unit: string;
  stockStatus: StockStatus;
  county: string;
  supplierId: string;
  supplierName: string;
  description: string | null;
  photoUrl: string | null;
}

export interface PricePoint {
  date: string;
  pricePerKg: number;
}

export interface CreateListingDto {
  crop: string;
  variety?: string;
  quantityKg: number;
  pricePerKg: number;
  qualityGrade?: QualityGrade;
  county: string;
  availableFrom: string;
  availableTo?: string;
  description?: string;
  harvestId?: string;
  photoUrls?: string[];
}

interface ListResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

function buildQs(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface MarketOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  items: Array<{ productId: string; productName: string; quantity: number; unitPriceKes: number }>;
  totalKes: number;
  status: OrderStatus;
  createdAt: string;
}

export interface SupplierProfile {
  id: string;
  userId: string;
  businessName: string;
  description: string | null;
  county: string;
  subCounty: string | null;
  categories: string[];
  phone: string;
  address: string | null;
}

interface SupplierProfileListResponse {
  data: SupplierProfile[];
  meta: { page: number; page_size: number; total: number; total_pages: number };
}

export const marketApi = {
  listings: {
    list: (params?: { crop?: string; county?: string; grade?: QualityGrade; page?: number }) =>
      apiFetch<ListResponse<ProduceListing>>(
        `/market/listings${buildQs({ crop: params?.crop, county: params?.county, grade: params?.grade, page: params?.page })}`
      ),
    get: (id: string) =>
      apiFetch<{ data: ProduceListing }>(`/market/listings/${id}`),
    create: (dto: CreateListingDto) =>
      apiFetch<{ data: ProduceListing }>('/market/listings', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    update: (id: string, dto: Partial<CreateListingDto>) =>
      apiFetch<{ data: ProduceListing }>(`/market/listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    delete: (id: string) =>
      apiFetch<void>(`/market/listings/${id}`, { method: 'DELETE' }),
    inquire: (id: string, message: string) =>
      apiFetch<{ phone: string }>(`/market/listings/${id}/inquire`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
  },
  products: {
    list: (params?: { category?: ProductCategory; page?: number }) =>
      apiFetch<ListResponse<SupplierProduct>>(
        `/market/products${buildQs({ category: params?.category, page: params?.page })}`
      ),
  },
  supplierProfiles: {
    list: (params?: { county?: string; subCounty?: string; category?: string; page?: number }) =>
      apiFetch<SupplierProfileListResponse>(
        `/market/supplier-profiles${buildQs({
          county: params?.county,
          subCounty: params?.subCounty,
          category: params?.category,
          page: params?.page,
        })}`,
      ),
    get: (id: string) =>
      apiFetch<{ data: SupplierProfile }>(`/market/supplier-profiles/${id}`),
  },
  prices: {
    history: (crop: string) =>
      apiFetch<{ data: PricePoint[] }>(`/market/prices${buildQs({ crop, days: 30 })}`),
  },
  orders: {
    list: () => apiFetch<{ data: MarketOrder[] }>('/market/orders'),
    create: (items: Array<{ productId: string; quantity: number }>) =>
      apiFetch<{ data: { id: string } }>('/market/orders', {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    updateStatus: (id: string, status: OrderStatus) =>
      apiFetch<{ data: MarketOrder }>(`/market/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
};
