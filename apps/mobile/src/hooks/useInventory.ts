import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import api from '../lib/api';

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
  productType: 'eggs' | 'milk' | 'honey' | 'other';
  quantity: number;          // trays for eggs, litres for milk
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

export interface InventorySummary {
  totalItemsLow: number;     // items below 20% remaining
  totalItemsEmpty: number;   // items at 0
  totalPendingCollectionsKes: number;
  totalHarvestInStoreKes: number;
  eggsCollectedToday: number | null;
  milkCollectedTodayL: number | null;
}

// ── Hooks ──────────────────────────────────────────────────────────

export function useInventoryItems(farmId?: string) {
  return useQuery<InventoryItem[]>({
    queryKey: ['inventory', 'inputs', farmId],
    queryFn: () => api.get<InventoryItem[]>(`/inventory/inputs${farmId ? `?farmId=${farmId}` : ''}`).then((r: AxiosResponse<InventoryItem[]>) => r.data),
    staleTime: 5 * 60 * 1000,
    initialDataUpdatedAt: 0,
    initialData: [
      {
        id: 'inv-1', farmId: 'farm-1', name: 'CAN Fertiliser',
        category: 'fertiliser' as InputCategory, emoji: '🌾', unit: 'bags',
        purchasedQty: 10, usedQty: 6, remainingQty: 4,
        totalPurchasedQty: 10, costPerUnit: 3200, supplier: 'Farmers Choice Ltd',
        lastUsedDate: '2025-06-01', reorderAlert: false,
        scheduledUseDate: '2025-06-10', notes: '',
      },
      {
        id: 'inv-2', farmId: 'farm-1', name: 'Mancozeb 80WP',
        category: 'pesticide' as InputCategory, emoji: '🌿', unit: 'kg',
        purchasedQty: 5, usedQty: 4.9, remainingQty: 0.1,
        totalPurchasedQty: 5, costPerUnit: 480, supplier: 'Nakuru Agrovets',
        lastUsedDate: '2025-05-28', reorderAlert: true,
        scheduledUseDate: '2025-06-08', notes: 'For Grey Leaf Spot prevention',
      },
      {
        id: 'inv-3', farmId: 'farm-1', name: 'Maize Seed H614D',
        category: 'seed' as InputCategory, emoji: '🌱', unit: 'kg',
        purchasedQty: 5, usedQty: 3, remainingQty: 2,
        totalPurchasedQty: 5, costPerUnit: 850, supplier: 'KALRO Seed Centre',
        lastUsedDate: '2025-04-01', reorderAlert: false,
        scheduledUseDate: null, notes: 'Next planting September 2025',
      },
      {
        id: 'inv-4', farmId: 'farm-1', name: 'Poultry Feed',
        category: 'animal_feed' as InputCategory, emoji: '🐾', unit: 'sacks',
        purchasedQty: 10, usedQty: 7, remainingQty: 3,
        totalPurchasedQty: 10, costPerUnit: 3500, supplier: 'Unga Feeds Ltd',
        lastUsedDate: '2025-06-05', reorderAlert: true,
        scheduledUseDate: null, notes: '6.5kg/day for 50 birds = ~5.4 days remaining',
      },
      {
        id: 'inv-5', farmId: 'farm-1', name: 'Newcastle Vaccine (vials)',
        category: 'vaccine' as InputCategory, emoji: '💉', unit: 'vials',
        purchasedQty: 5, usedQty: 5, remainingQty: 0,
        totalPurchasedQty: 5, costPerUnit: 450, supplier: 'AgroVet Supplies',
        lastUsedDate: '2025-01-15', reorderAlert: true,
        scheduledUseDate: '2025-04-15', notes: 'OVERDUE — 7 weeks late',
      },
      {
        id: 'inv-6', farmId: 'farm-1', name: 'Knapsack Sprayer',
        category: 'tool_equipment' as InputCategory, emoji: '🔧', unit: 'units',
        purchasedQty: 1, usedQty: 0, remainingQty: 1,
        totalPurchasedQty: 1, costPerUnit: 4500, supplier: 'Nakuru Agrovets',
        lastUsedDate: '2025-06-04', reorderAlert: false,
        scheduledUseDate: null, notes: 'Working condition',
      },
    ],
  });
}

export function useAnimalProducts(farmId?: string) {
  return useQuery<AnimalProductRecord[]>({
    queryKey: ['inventory', 'animal-products', farmId],
    queryFn: () => api.get<AnimalProductRecord[]>(`/inventory/animal-products${farmId ? `?farmId=${farmId}` : ''}`).then((r: AxiosResponse<AnimalProductRecord[]>) => r.data),
    staleTime: 5 * 60 * 1000,
    initialDataUpdatedAt: 0,
    initialData: [
      { id: 'ap-1', date: '2025-06-02', productType: 'eggs', quantity: 8, unit: 'trays', farmId: 'farm-1', animalGroupId: 'ag-1', soldQty: 8, pendingQty: 0, pricePerUnit: 150 },
      { id: 'ap-2', date: '2025-06-03', productType: 'eggs', quantity: 7.5, unit: 'trays', farmId: 'farm-1', animalGroupId: 'ag-1', soldQty: 5, pendingQty: 2.5, pricePerUnit: 150 },
      { id: 'ap-3', date: '2025-06-04', productType: 'eggs', quantity: 8, unit: 'trays', farmId: 'farm-1', animalGroupId: 'ag-1', soldQty: 8, pendingQty: 0, pricePerUnit: 150 },
      { id: 'ap-4', date: '2025-06-05', productType: 'eggs', quantity: 7, unit: 'trays', farmId: 'farm-1', animalGroupId: 'ag-1', soldQty: 7, pendingQty: 0, pricePerUnit: 150 },
      { id: 'ap-5', date: '2025-06-06', productType: 'eggs', quantity: 8.5, unit: 'trays', farmId: 'farm-1', animalGroupId: 'ag-1', soldQty: 6, pendingQty: 2.5, pricePerUnit: 150 },
      { id: 'ap-6', date: '2025-06-07', productType: 'eggs', quantity: 6.5, unit: 'trays', farmId: 'farm-1', animalGroupId: 'ag-1', soldQty: 0, pendingQty: 6.5, pricePerUnit: 150 },
      { id: 'ap-7', date: '2025-06-07', productType: 'milk', quantity: 28, unit: 'litres', farmId: 'farm-1', animalGroupId: 'ag-2', soldQty: 8, pendingQty: 20, pricePerUnit: 60 },
    ],
  });
}

export function useHarvestStore(farmId?: string) {
  return useQuery<HarvestStore[]>({
    queryKey: ['inventory', 'harvest-store', farmId],
    queryFn: () => api.get<HarvestStore[]>(`/inventory/harvest-store${farmId ? `?farmId=${farmId}` : ''}`).then((r: AxiosResponse<HarvestStore[]>) => r.data),
    staleTime: 5 * 60 * 1000,
    initialDataUpdatedAt: 0,
    initialData: [
      {
        id: 'hs-1', farmId: 'farm-1', cropName: 'Maize', variety: 'H614D',
        harvestDate: '2024-09-15', quantityKg: 800, soldKg: 600, remainingKg: 200,
        gradeLabel: 'A', storageLocation: 'Granary A',
        estimatedValueKes: 9600,
      },
      {
        id: 'hs-2', farmId: 'farm-1', cropName: 'Beans', variety: 'Rose Coco',
        harvestDate: '2024-10-01', quantityKg: 120, soldKg: 120, remainingKg: 0,
        gradeLabel: 'A', storageLocation: '-', estimatedValueKes: 0,
      },
    ],
  });
}

export function useCustomerCollections(farmId?: string) {
  return useQuery<CustomerCollection[]>({
    queryKey: ['inventory', 'collections', farmId],
    queryFn: () => api.get<CustomerCollection[]>(`/inventory/collections${farmId ? `?farmId=${farmId}` : ''}`).then((r: AxiosResponse<CustomerCollection[]>) => r.data),
    staleTime: 2 * 60 * 1000,
    initialDataUpdatedAt: 0,
    initialData: [
      {
        id: 'cc-1', customerName: 'Grace Kamau', customerPhone: '+254722111222',
        productType: 'eggs', quantity: 5, unit: 'trays',
        pricePerUnit: 150, totalAmount: 750,
        takenDate: '2025-06-03', paidDate: null, isPaid: false,
        farmId: 'farm-1', notes: 'Regular customer',
      },
      {
        id: 'cc-2', customerName: 'John Mwangi', customerPhone: '+254733222333',
        productType: 'milk', quantity: 20, unit: 'litres',
        pricePerUnit: 60, totalAmount: 1200,
        takenDate: '2025-06-04', paidDate: null, isPaid: false,
        farmId: 'farm-1', notes: 'Daily milk customer',
      },
    ],
  });
}

export function useInventorySummary() {
  return useQuery<InventorySummary>({
    queryKey: ['inventory', 'summary'],
    queryFn: () => api.get<InventorySummary>('/inventory/summary').then((r: AxiosResponse<InventorySummary>) => r.data),
    staleTime: 5 * 60 * 1000,
    initialDataUpdatedAt: 0,
    initialData: {
      totalItemsLow: 3,
      totalItemsEmpty: 2,
      totalPendingCollectionsKes: 1950,
      totalHarvestInStoreKes: 9600,
      eggsCollectedToday: 6.5,
      milkCollectedTodayL: 28,
    },
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useRecordInputUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { itemId: string; qtyUsed: number; usedDate: string; activityId?: string; notes?: string }) =>
      api.post(`/inventory/inputs/${data.itemId}/use`, data).then((r: AxiosResponse<unknown>) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useRecordAnimalProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { productType: string; quantity: number; date: string; farmId: string; animalGroupId: string; pricePerUnit: number }) =>
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
      qc.invalidateQueries({ queryKey: ['finance'] });
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
