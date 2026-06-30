import { apiFetch } from './client';

export interface InputStockItem {
  id: string;
  emoji: string;
  name: string;
  purchasedLabel: string;
  usedLabel: string;
  remainingLabel: string;
  pctRemaining: number;
  estimatedPriceKes: number;
  linkedActivity?: string | null;
}

export interface AnimalProductToday {
  id: string;
  type: 'eggs' | 'milk';
  quantity: number;
  date: string;
}

export interface CustomerCollectionItem {
  id: string;
  customerName: string;
  product: string;
  qty: string;
  amountKes: number;
  since: string;
}

export const inventoryApi = {
  inputs: {
    list: () => apiFetch<{ data: InputStockItem[] }>('/inventory/inputs'),
  },
  animalProducts: {
    list: () =>
      apiFetch<{ data: AnimalProductToday[] }>('/inventory/animal-products'),
  },
  collections: {
    list: () =>
      apiFetch<{ data: CustomerCollectionItem[] }>('/inventory/collections'),
    markPaid: (id: string) =>
      apiFetch<{ data: { id: string } }>(`/inventory/collections/${id}/pay`, {
        method: 'PATCH',
      }),
  },
};
