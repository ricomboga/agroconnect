import { InputCategory } from '../hooks/useInventory';

export const CATEGORY_CONFIG: Record<InputCategory, { emoji: string; label: string; color: string }> = {
  fertiliser:      { emoji: '🌾', label: 'Fertiliser',       color: '#1A6B3C' },
  pesticide:       { emoji: '🌿', label: 'Pesticide',         color: '#D97706' },
  herbicide:       { emoji: '🌱', label: 'Herbicide',         color: '#0E7490' },
  seed:            { emoji: '🫘', label: 'Seeds',             color: '#7C3AED' },
  animal_feed:     { emoji: '🐾', label: 'Animal Feed',       color: '#1A6B3C' },
  animal_medicine: { emoji: '💊', label: 'Animal Medicine',   color: '#DC2626' },
  vaccine:         { emoji: '💉', label: 'Vaccine',           color: '#1D4ED8' },
  tool_equipment:  { emoji: '🔧', label: 'Tools/Equipment',   color: '#374151' },
  other:           { emoji: '📦', label: 'Other',             color: '#6B7280' },
};

export function getStockBadgeVariant(pct: number): 'green' | 'amber' | 'red' {
  if (pct > 30) return 'green';
  if (pct > 10) return 'amber';
  return 'red';
}

export function getStockBarColor(pct: number): string {
  if (pct > 30) return '#1A6B3C';
  if (pct > 10) return '#D97706';
  return '#DC2626';
}

export function getStockBadgeLabel(item: { remainingQty: number; purchasedQty: number; unit: string }): string {
  if (item.remainingQty <= 0) return 'EMPTY';
  return `${item.remainingQty} ${item.unit} left`;
}

export function formatQty(qty: number, unit: string): string {
  if (unit === 'bags') return `${qty} bag${qty !== 1 ? 's' : ''}`;
  if (unit === 'kg') return `${qty}kg`;
  if (unit === 'litres') return `${qty}L`;
  if (unit === 'trays') return `${qty} tray${qty !== 1 ? 's' : ''}`;
  return `${qty} ${unit}`;
}

export function getDaysUntilOutOfStock(
  remainingQty: number,
  dailyUsageQty: number
): number | null {
  if (dailyUsageQty <= 0) return null;
  return Math.floor(remainingQty / dailyUsageQty);
}
