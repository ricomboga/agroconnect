import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

export class FarmModel extends Model {
  static table = 'farms';

  @field('name') name!: string;
  @field('county') county!: string;
  @field('area_acres') areaAcres!: number;
  @field('soil_type') soilType!: string | null;
  @field('gps_lat') gpsLat!: number | null;
  @field('gps_lng') gpsLng!: number | null;
  @field('status') status!: string;
  @field('owner_id') ownerId!: string;
  @readonly @date('created_at') createdAt!: Date;
}
