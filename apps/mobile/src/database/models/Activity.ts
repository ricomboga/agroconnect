import { Model } from '@nozbe/watermelondb';
import { field, relation, readonly, date } from '@nozbe/watermelondb/decorators';
import { FarmModel } from './Farm';

export class ActivityModel extends Model {
  static table = 'activities';

  @field('farm_id') farmId!: string;
  @field('plot_id') plotId!: string | null;
  @field('type') type!: string;
  @field('description') description!: string | null;
  @date('planned_date') plannedDate!: Date;
  @date('actual_date') actualDate!: Date | null;
  @field('status') status!: string;
  @field('labour_cost_kes') labourCostKes!: number | null;
  @readonly @date('created_at') createdAt!: Date;

  @relation('farms', 'farm_id') farm!: FarmModel;
}
