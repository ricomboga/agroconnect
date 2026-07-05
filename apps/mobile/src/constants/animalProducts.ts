// Curated animal/farm product types shown as quick-pick chips throughout the
// Inventory screens. `productType` sent to the backend is not restricted to
// this list — farmers can type a custom product name (e.g. "rabbit"), which
// is stored as-is and rendered with the generic fallback config below.

export type KnownAnimalProductType =
  | 'eggs'
  | 'cow_milk'
  | 'goat_milk'
  | 'fish'
  | 'honey'
  | 'wool'
  | 'other';

export interface AnimalProductTypeConfig {
  key: KnownAnimalProductType;
  emoji: string;
  unit: string;
  labelKey: string;
  color: string;
}

export const ANIMAL_PRODUCT_TYPES: AnimalProductTypeConfig[] = [
  { key: 'eggs',      emoji: '🥚', unit: 'trays',  labelKey: 'inventory.productTypes.eggs',     color: '#1A6B3C' },
  { key: 'cow_milk',  emoji: '🥛', unit: 'litres', labelKey: 'inventory.productTypes.cowMilk',  color: '#0E7490' },
  { key: 'goat_milk', emoji: '🐐', unit: 'litres', labelKey: 'inventory.productTypes.goatMilk', color: '#7C3AED' },
  { key: 'fish',      emoji: '🐟', unit: 'kg',     labelKey: 'inventory.productTypes.fish',     color: '#2563EB' },
  { key: 'honey',     emoji: '🍯', unit: 'kg',     labelKey: 'inventory.productTypes.honey',    color: '#D97706' },
  { key: 'wool',      emoji: '🧶', unit: 'kg',     labelKey: 'inventory.productTypes.wool',     color: '#6B7280' },
];

const FALLBACK_CONFIG: Omit<AnimalProductTypeConfig, 'key'> = {
  emoji: '📦',
  unit: 'units',
  labelKey: '',
  color: '#6B7280',
};

// Legacy records created before the cow/goat milk split just say "milk".
const LEGACY_ALIASES: Record<string, KnownAnimalProductType> = {
  milk: 'cow_milk',
};

export function getProductConfig(productType: string): AnimalProductTypeConfig {
  const normalized = LEGACY_ALIASES[productType] ?? productType;
  const known = ANIMAL_PRODUCT_TYPES.find((p) => p.key === normalized);
  if (known) return known;
  return { key: productType as KnownAnimalProductType, ...FALLBACK_CONFIG };
}

export function productLabel(productType: string, t: (key: string) => string): string {
  const config = getProductConfig(productType);
  if (config.labelKey) return t(config.labelKey);
  // Custom farmer-typed product name — title-case it for display.
  return productType.charAt(0).toUpperCase() + productType.slice(1);
}
