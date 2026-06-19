import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'farms',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'county', type: 'string' },
        { name: 'area_acres', type: 'number' },
        { name: 'soil_type', type: 'string', isOptional: true },
        { name: 'gps_lat', type: 'number', isOptional: true },
        { name: 'gps_lng', type: 'number', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'owner_id', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'activities',
      columns: [
        { name: 'farm_id', type: 'string', isIndexed: true },
        { name: 'plot_id', type: 'string', isOptional: true },
        { name: 'type', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'planned_date', type: 'number' },
        { name: 'actual_date', type: 'number', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'labour_cost_kes', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'inputs',
      columns: [
        { name: 'farm_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' },
        { name: 'product_name', type: 'string' },
        { name: 'quantity', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'unit_cost_kes', type: 'number' },
        { name: 'total_cost_kes', type: 'number' },
        { name: 'applied_date', type: 'number' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'harvests',
      columns: [
        { name: 'farm_id', type: 'string', isIndexed: true },
        { name: 'crop', type: 'string' },
        { name: 'variety', type: 'string', isOptional: true },
        { name: 'quantity_kg', type: 'number' },
        { name: 'quality_grade', type: 'string', isOptional: true },
        { name: 'harvest_date', type: 'number' },
        { name: 'storage_location', type: 'string', isOptional: true },
        { name: 'sold_quantity_kg', type: 'number' },
        { name: 'avg_price_kes', type: 'number', isOptional: true },
        { name: 'total_revenue_kes', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'operation', type: 'string' },
        { name: 'entity', type: 'string' },
        { name: 'endpoint', type: 'string' },
        { name: 'payload', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
      ],
    }),
  ],
});
