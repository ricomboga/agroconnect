import { apiFetch } from './client';

export type QualityGrade = 'A' | 'B' | 'C' | 'reject';
export type ProductCategory = 'seed' | 'fertiliser' | 'pesticide' | 'herbicide' | 'equipment' | 'veterinary' | 'other';
export type ListingStatus = 'active' | 'sold' | 'expired' | 'withdrawn';

export interface ProduceListing {
  id: string;
  farmerId: string;
  farmId: string;
  harvestId: string | null;
  crop: string;
  variety: string | null;
  quantityKg: number;
  askingPriceKes: number;
  qualityGrade: QualityGrade;
  availableFrom: string;
  availableUntil: string;
  locationCounty: string;
  locationDescription: string | null;
  photos: string[];
  status: ListingStatus;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  name: string;
  category: ProductCategory;
  brand: string | null;
  description: string;
  unit: string;
  pricePerUnitKes: number;
  stockQuantity: number;
  sku: string | null;
  countyAvailability: string[];
  photos: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingDto {
  farmId: string;
  harvestId?: string;
  crop: string;
  variety?: string;
  quantityKg: number;
  askingPriceKes: number;
  qualityGrade: QualityGrade;
  availableFrom: string;
  availableUntil: string;
  locationCounty: string;
  locationDescription?: string;
  photos?: string[];
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

export type OrderStatus = 'pending' | 'confirmed' | 'dispatched' | 'delivered';

export interface MarketOrder {
  id: string;
  buyerId: string;
  supplierId: string;
  productId: string;
  quantityUnits: number;
  unitPriceKes: number;
  totalPriceKes: number;
  deliveryAddress: string;
  notes: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDto {
  productId: string;
  quantityUnits: number;
  deliveryAddress: string;
  notes?: string;
}

export interface PricePoint {
  date: string;
  pricePerKg: number;
}

export interface SupplierProfile {
  id: string;
  userId: string;
  businessName: string;
  deliveryRadiusKm: string | null;
  description: string | null;
  county: string;
  subCounty: string | null;
  categories: string[];
  phone: string;
  address: string | null;
}

interface SupplierProfileListResponse {
  data: SupplierProfile[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    matched_on: 'subCounty' | 'county' | 'region' | null;
  };
}

export const marketApi = {
  listings: {
    list: (params?: { crop?: string; county?: string; grade?: QualityGrade; farmerId?: string; page?: number }) =>
      apiFetch<ListResponse<ProduceListing>>(
        `/market/listings${buildQs({
          crop: params?.crop,
          county: params?.county,
          quality_grade: params?.grade,
          farmerId: params?.farmerId,
          page: params?.page,
        })}`
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
      apiFetch<{ data: { message: string } }>(`/market/listings/${id}/inquire`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
  },
  products: {
    list: (params?: { category?: ProductCategory; county?: string; search?: string; page?: number }) =>
      apiFetch<ListResponse<SupplierProduct>>(
        `/market/products${buildQs({
          category: params?.category,
          county: params?.county,
          search: params?.search,
          page: params?.page,
        })}`
      ),
    get: (id: string) =>
      apiFetch<{ data: SupplierProduct }>(`/market/products/${id}`),
  },
  supplierProfiles: {
    list: (params?: { county?: string; subCounty?: string; category?: string; userId?: string; page?: number }) =>
      apiFetch<SupplierProfileListResponse>(
        `/market/supplier-profiles${buildQs({
          county: params?.county,
          subCounty: params?.subCounty,
          category: params?.category,
          userId: params?.userId,
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
    create: (dto: CreateOrderDto) =>
      apiFetch<{ data: MarketOrder }>('/market/orders', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    updateStatus: (id: string, status: OrderStatus) =>
      apiFetch<{ data: MarketOrder }>(`/market/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
};
