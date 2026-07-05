import { prisma } from '@agroconnect/db/market';

export interface ProductSearchResult {
  id: string;
  supplier_id: string;
  name: string;
  category: string;
  brand: string | null;
  unit: string;
  price_kes: number;
  stock_quantity: number;
  county_availability: string[];
}

export async function searchProductsByNames(
  names: string[],
  county?: string,
): Promise<ProductSearchResult[]> {
  if (names.length === 0) return [];

  const where: Record<string, unknown> = {
    isActive: true,
    OR: names.map((n) => ({ name: { contains: n, mode: 'insensitive' } })),
  };

  if (county) {
    where['countyAvailability'] = { array_contains: [county] };
  }

  interface RawProductSearchRow {
    id: string;
    supplierId: string;
    name: string;
    category: string;
    brand: string | null;
    unit: string;
    pricePerUnitKes: unknown;
    stockQuantity: unknown;
    countyAvailability: unknown;
  }

  const rawRows = await prisma.supplierProduct.findMany({
    where,
    orderBy: [{ stockQuantity: 'desc' }, { pricePerUnitKes: 'asc' }],
    take: 20,
    select: {
      id: true,
      supplierId: true,
      name: true,
      category: true,
      brand: true,
      unit: true,
      pricePerUnitKes: true,
      stockQuantity: true,
      countyAvailability: true,
    },
  });
  const rows = rawRows as unknown as RawProductSearchRow[];

  return rows.map((r) => ({
    id: r.id,
    supplier_id: r.supplierId,
    name: r.name,
    category: r.category,
    brand: r.brand,
    unit: r.unit,
    price_kes: Number(r.pricePerUnitKes),
    stock_quantity: Number(r.stockQuantity),
    county_availability: Array.isArray(r.countyAvailability) ? (r.countyAvailability as string[]) : [],
  }));
}
