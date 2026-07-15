import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import api from '../lib/api';

// Finance-related data is cached under several distinct query keys across
// the app (Home dashboard: 'transactions', Finance module: 'finance/transactions'
// and 'finance/report'). invalidateQueries({queryKey: ['finance']}) does NOT
// match any of these — React Query only invalidates by array-prefix — so every
// mutation that affects finance data must invalidate each real key explicitly.
export function invalidateFinanceQueries(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['transactions'] });
  qc.invalidateQueries({ queryKey: ['finance/transactions'] });
  qc.invalidateQueries({ queryKey: ['finance/report'] });
}

// ── Types ──────────────────────────────────────────────────────────

export type InputCategory =
  | 'fertiliser'
  | 'pesticide'
  | 'herbicide'
  | 'seed'
  | 'animal_feed'
  | 'animal_medicine'
  | 'vaccine'
  | 'tool_equipment'
  | 'other';

export interface InventoryItem {
  id: string;
  farmId: string;
  name: string;                 // e.g. "CAN Fertiliser", "Mancozeb 80WP"
  category: InputCategory;
  emoji: string;                // category icon
  unit: string;                 // "bags", "kg", "litres", "units", "pieces"
  purchasedQty: number;         // total ever purchased
  usedQty: number;              // total used so far
  remainingQty: number;         // purchasedQty - usedQty
  totalPurchasedQty: number;    // running total (can buy multiple times)
  costPerUnit: number;          // KES per unit
  supplier: string;             // where they buy it
  lastUsedDate: string | null;  // ISO date
  reorderAlert: boolean;        // true if below reorder threshold
  scheduledUseDate: string | null; // if there's a scheduled activity using this
  notes: string;
}

export interface AnimalProductRecord {
  id: string;
  date: string;              // ISO date (one record per day per product type)
  productType: string;       // e.g. "eggs", "cow_milk", "fish", or a farmer-typed custom name
  quantity: number;
  unit: string;
  farmId: string;
  animalGroupId: string;
  soldQty: number;           // how much was sold that day
  pendingQty: number;        // collected - sold (in store or with customers)
  pricePerUnit: number;      // KES per unit
}

export interface HarvestStore {
  id: string;
  farmId: string;
  cropName: string;
  variety: string;
  harvestDate: string;
  quantityKg: number;        // total harvested
  soldKg: number;            // already sold
  remainingKg: number;       // still in store
  gradeLabel: string;        // A, B, C
  storageLocation: string;   // e.g. "Granary A", "Rented cold storage"
  estimatedValueKes: number; // remaining * current market price
}

export interface CustomerCollection {
  id: string;
  customerName: string;
  customerPhone: string;
  productType: string;       // "eggs", "milk", "maize", etc.
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalAmount: number;       // quantity * pricePerUnit
  takenDate: string;         // when they took the goods
  paidDate: string | null;   // null = not yet paid
  isPaid: boolean;
  farmId: string;
  notes: string;
}

export interface AnimalProductToday {
  productType: string;
  quantity: number;
}

export interface InventorySummary {
  totalItemsLow: number;     // items below 20% remaining
  totalItemsEmpty: number;   // items at 0
  totalPendingCollectionsKes: number;
  totalHarvestInStoreKes: number;
  animalProductsToday: AnimalProductToday[];
}

// ── Hooks ──────────────────────────────────────────────────────────

export function useInventoryItems(farmId?: string) {
  return useQuery<InventoryItem[]>({
    queryKey: ['inventory', 'inputs', farmId],
    queryFn: () =>
      api
        .get<{ data: InventoryItem[] }>(`/inventory/inputs${farmId ? `?farmId=${farmId}` : ''}`)
        .then((r: AxiosResponse<{ data: InventoryItem[] }>) => r.data.data),
    enabled: farmId === undefined || !!farmId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnimalProducts(farmId?: string) {
  return useQuery<AnimalProductRecord[]>({
    queryKey: ['inventory', 'animal-products', farmId],
    queryFn: () =>
      api
        .get<{ data: AnimalProductRecord[] }>(`/inventory/animal-products${farmId ? `?farmId=${farmId}` : ''}`)
        .then((r: AxiosResponse<{ data: AnimalProductRecord[] }>) => r.data.data),
    enabled: farmId === undefined || !!farmId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHarvestStore(farmId?: string) {
  return useQuery<HarvestStore[]>({
    queryKey: ['inventory', 'harvest-store', farmId],
    queryFn: () =>
      api
        .get<{ data: HarvestStore[] }>(`/inventory/harvest-store${farmId ? `?farmId=${farmId}` : ''}`)
        .then((r: AxiosResponse<{ data: HarvestStore[] }>) => r.data.data),
    enabled: farmId === undefined || !!farmId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomerCollections(farmId?: string) {
  return useQuery<CustomerCollection[]>({
    queryKey: ['inventory', 'collections', farmId],
    queryFn: () =>
      api
        .get<{ data: CustomerCollection[] }>(`/inventory/collections${farmId ? `?farmId=${farmId}` : ''}`)
        .then((r: AxiosResponse<{ data: CustomerCollection[] }>) => r.data.data),
    enabled: farmId === undefined || !!farmId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useInventorySummary() {
  return useQuery<InventorySummary>({
    queryKey: ['inventory', 'summary'],
    queryFn: () =>
      api
        .get<{ data: InventorySummary }>('/inventory/summary')
        .then((r: AxiosResponse<{ data: InventorySummary }>) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export interface InventoryReportRow {
  inputs: Array<{
    farmId: string;
    farmName: string;
    name: string;
    category: string;
    unit: string;
    purchasedQty: number;
    usedQty: number;
    remainingQty: number;
    costPerUnit: number;
    supplier: string;
  }>;
  collections: Array<{
    farmId: string;
    farmName: string;
    customerName: string;
    productType: string;
    quantity: number;
    unit: string;
    totalAmount: number;
    takenDate: string;
    isPaid: boolean;
  }>;
  harvest: Array<{
    farmId: string;
    farmName: string;
    crop: string;
    variety: string;
    quantityKg: number;
    soldQuantityKg: number;
    remainingKg: number;
    harvestDate: string;
    storageLocation: string;
  }>;
  totals: {
    inputsRemainingValueKes: number;
    collectionsPendingKes: number;
    harvestRemainingKg: number;
  };
}

export interface InventoryReport extends InventoryReportRow {
  asOfDate: string;
  farms: Array<{ id: string; name: string }>;
}

export async function fetchInventoryReport(asOfDate: string): Promise<InventoryReport> {
  const r = await api.get<{ data: InventoryReport }>(`/inventory/report?asOfDate=${asOfDate}`);
  return r.data.data;
}

// ── Mutations ──────────────────────────────────────────────────────

export function useRecordInputUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { itemId: string; qtyUsed: number; usedDate: string; activityId?: string; notes?: string }) =>
      api.post(`/inventory/inputs/${data.itemId}/use`, data).then((r: AxiosResponse<unknown>) => r.data),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ['inventory', 'inputs'] });
      const previousItems = qc.getQueriesData<InventoryItem[]>({ queryKey: ['inventory', 'inputs'] });
      qc.setQueriesData<InventoryItem[]>({ queryKey: ['inventory', 'inputs'] }, (old) => {
        if (!old) return old;
        return old.map((item) =>
          item.id === data.itemId
            ? {
                ...item,
                remainingQty: Math.max(0, item.remainingQty - data.qtyUsed),
                usedQty: item.usedQty + data.qtyUsed,
                lastUsedDate: data.usedDate,
              }
            : item,
        );
      });
      return { previousItems };
    },
    onError: (_err, _data, context) => {
      if (context?.previousItems) {
        for (const [queryKey, queryData] of context.previousItems) {
          qc.setQueryData(queryKey, queryData);
        }
      }
    },
    onSuccess: () => {
      // Don't invalidate inventory/inputs — the optimistic update is the source of truth
      // until the backend has a real inventory DB.
    },
  });
}

export function useAddInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<InventoryItem, 'id' | 'usedQty' | 'remainingQty'>) =>
      api.post('/inventory/inputs', data).then((r: AxiosResponse<unknown>) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'inputs'] });
    },
  });
}

export function useRestockItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { itemId: string; qtyAdded: number; costPerUnit: number; purchaseDate: string; supplier: string }) =>
      api.post(`/inventory/inputs/${data.itemId}/restock`, data).then((r: AxiosResponse<unknown>) => r.data),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ['inventory', 'inputs'] });
      const previousItems = qc.getQueriesData<InventoryItem[]>({ queryKey: ['inventory', 'inputs'] });
      qc.setQueriesData<InventoryItem[]>({ queryKey: ['inventory', 'inputs'] }, (old) => {
        if (!old) return old;
        return old.map((item) =>
          item.id === data.itemId
            ? {
                ...item,
                remainingQty: item.remainingQty + data.qtyAdded,
                totalPurchasedQty: item.totalPurchasedQty + data.qtyAdded,
                costPerUnit: data.costPerUnit,
                supplier: data.supplier,
                reorderAlert: false,
              }
            : item,
        );
      });
      return { previousItems };
    },
    onError: (_err, _data, context) => {
      if (context?.previousItems) {
        for (const [queryKey, queryData] of context.previousItems) {
          qc.setQueryData(queryKey, queryData);
        }
      }
    },
    onSuccess: () => {
      // Don't invalidate inventory/inputs — the optimistic update is the source of truth
      // until the backend has a real inventory DB. Only sync finance (purchase cost recorded).
      invalidateFinanceQueries(qc);
    },
  });
}

export function useRecordAnimalProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { productType: string; quantity: number; date: string; farmId: string; animalGroupId: string; pricePerUnit: number; unit?: string }) =>
      api.post('/inventory/animal-products', data).then((r: AxiosResponse<unknown>) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'animal-products'] });
    },
  });
}

export function useMarkCollectionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (collectionId: string) =>
      api.patch(`/inventory/collections/${collectionId}/pay`).then((r: AxiosResponse<unknown>) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'collections'] });
      invalidateFinanceQueries(qc);
    },
  });
}

export function useAddCustomerCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CustomerCollection, 'id' | 'isPaid' | 'paidDate'>) =>
      api.post('/inventory/collections', data).then((r: AxiosResponse<unknown>) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'collections'] });
    },
  });
}

export function useRecordHarvestStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<HarvestStore, 'id' | 'soldKg' | 'remainingKg' | 'estimatedValueKes'>) =>
      api.post('/inventory/harvest-store', data).then((r: AxiosResponse<unknown>) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'harvest-store'] });
    },
  });
}

export function useRecordHarvestSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { harvestId: string; soldKg: number; pricePerKg: number; buyerName?: string; saleDate: string }) =>
      api.post(`/inventory/harvest-store/${data.harvestId}/sell`, data).then((r: AxiosResponse<unknown>) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'harvest-store'] });
      invalidateFinanceQueries(qc);
    },
  });
}

export function useUpdateHarvestStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { harvestId: string; newRemainingKg: number; notes?: string }) =>
      api.patch(`/inventory/harvest-store/${data.harvestId}/stock`, data).then((r: AxiosResponse<unknown>) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'harvest-store'] });
    },
  });
}

export function useUpdateAnimalProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string; quantity: number; notes?: string }) =>
      api.patch(`/inventory/animal-products/${data.id}`, data).then((r: AxiosResponse<unknown>) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'animal-products'] });
      qc.invalidateQueries({ queryKey: ['inventory', 'summary'] });
    },
  });
}
