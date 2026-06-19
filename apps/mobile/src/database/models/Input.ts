import { Model } from '@nozbe/watermelondb';
import { field, relation, readonly, date } from '@nozbe/watermelondb/decorators';
import { FarmModel } from './Farm';

export class InputModel extends Model {
  static table = 'inputs';

  @field('farm_id') farmId!: string;
  @field('type') type!: string;
  @field('product_name') productName!: string;
  @field('quantity') quantity!: number;
  @field('unit') unit!: string;
  @field('unit_cost_kes') unitCostKes!: number;
  @field('total_cost_kes') totalCostKes!: number;
  @date('applied_date') appliedDate!: Date;
  @field('notes') notes!: string | null;
  @readonly @date('created_at') createdAt!: Date;

  @relation('farms', 'farm_id') farm!: FarmModel;
}
