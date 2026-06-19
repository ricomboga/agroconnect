import { Model } from '@nozbe/watermelondb';
import { field, relation, readonly, date } from '@nozbe/watermelondb/decorators';
import { FarmModel } from './Farm';

export class HarvestModel extends Model {
  static table = 'harvests';

  @field('farm_id') farmId!: string;
  @field('crop') crop!: string;
  @field('variety') variety!: string | null;
  @field('quantity_kg') quantityKg!: number;
  @field('quality_grade') qualityGrade!: string | null;
  @date('harvest_date') harvestDate!: Date;
  @field('storage_location') storageLocation!: string | null;
  @field('sold_quantity_kg') soldQuantityKg!: number;
  @field('avg_price_kes') avgPriceKes!: number | null;
  @field('total_revenue_kes') totalRevenueKes!: number | null;
  @field('notes') notes!: string | null;
  @readonly @date('created_at') createdAt!: Date;

  @relation('farms', 'farm_id') farm!: FarmModel;
}
