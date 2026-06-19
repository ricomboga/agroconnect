import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export class SyncQueueModel extends Model {
  static table = 'sync_queue';

  @field('operation') operation!: 'CREATE' | 'UPDATE' | 'DELETE';
  @field('entity') entity!: string;
  @field('endpoint') endpoint!: string;
  @field('payload') payload!: string;
  @field('status') status!: 'pending' | 'failed';
  @readonly @date('created_at') createdAt!: Date;
  @field('last_error') lastError!: string | null;
}
