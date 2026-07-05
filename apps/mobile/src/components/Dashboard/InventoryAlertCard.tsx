import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useInventoryItems } from '../../hooks/useInventory';
import type { AppTabParamList } from '../../navigation/types';
import type { InventoryItem } from '../../hooks/useInventory';

type Nav = BottomTabNavigationProp<AppTabParamList, 'Home'>;

const URGENCY_COLOR: Record<'critical' | 'low' | 'ok', string> = {
  critical: '#DC2626',
  low: '#D97706',
  ok: '#1A6B3C',
};

const URGENCY_BG: Record<'critical' | 'low' | 'ok', string> = {
  critical: '#FEF2F2',
  low: '#FFFBEB',
  ok: '#F0FDF4',
};

function urgency(item: InventoryItem): 'critical' | 'low' | 'ok' {
  if (item.remainingQty === 0) return 'critical';
  if (item.reorderAlert) return 'low';
  return 'ok';
}

function StockRow({ item }: { item: InventoryItem }) {
  const u = urgency(item);
  const color = URGENCY_COLOR[u];
  const pct = item.purchasedQty > 0
    ? Math.max(0, Math.min(1, item.remainingQty / item.purchasedQty))
    : 0;

  return (
    <View style={[row.container, { backgroundColor: URGENCY_BG[u] }]}>
      <View style={row.iconWrap}>
        <Text style={row.emoji}>{item.emoji}</Text>
      </View>
      <View style={row.info}>
        <View style={row.nameRow}>
          <Text style={row.name} numberOfLines={1}>{item.name}</Text>
          {u === 'critical' && (
            <View style={[row.badge, { backgroundColor: '#DC2626' }]}>
              <Text style={row.badgeText}>OUT</Text>
            </View>
          )}
          {u === 'low' && (
            <View style={[row.badge, { backgroundColor: '#D97706' }]}>
              <Text style={row.badgeText}>LOW</Text>
            </View>
          )}
        </View>
        <View style={row.track}>
          <View style={[row.trackFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        </View>
        <Text style={[row.qty, { color }]}>
          {item.remainingQty} {item.unit} {item.remainingQty === 0 ? 'remaining' : 'left'}
        </Text>
      </View>
    </View>
  );
}

const row = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    padding: 6,
    marginBottom: 4,
    gap: 8,
  },
  iconWrap: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 14 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  name: { fontSize: 9, fontWeight: '600', color: '#111827', flex: 1 },
  badge: {
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 7, fontWeight: '800', color: '#fff' },
  track: {
    height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginBottom: 2,
  },
  trackFill: { height: 4, borderRadius: 2 },
  qty: { fontSize: 8, fontWeight: '600' },
});

// ── Main card ──────────────────────────────────────────────────────────────

interface InventoryAlertCardProps {
  farmId: string;
}

export function InventoryAlertCard({ farmId }: InventoryAlertCardProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const { data: items = [] } = useInventoryItems(farmId);

  const alertItems = items
    .filter((i: InventoryItem) => i.reorderAlert || i.remainingQty === 0)
    .sort((a: InventoryItem, b: InventoryItem) => {
      const ua = urgency(a) === 'critical' ? 0 : 1;
      const ub = urgency(b) === 'critical' ? 0 : 1;
      return ua - ub;
    })
    .slice(0, 4);

  if (alertItems.length === 0) return null;

  const criticalCount = alertItems.filter((i: InventoryItem) => i.remainingQty === 0).length;
  const lowCount = alertItems.filter((i: InventoryItem) => i.remainingQty > 0 && i.reorderAlert).length;

  const goToInventory = () => {
    navigation.navigate('Inventory', { screen: 'InventoryHome' } as never);
  };

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text style={s.title}>{t('dashboard.inventory.alertTitle')}</Text>
          <View style={s.summaryRow}>
            {criticalCount > 0 && (
              <View style={[s.summaryBadge, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[s.summaryText, { color: '#DC2626' }]}>
                  {criticalCount} {t('dashboard.inventory.out')}
                </Text>
              </View>
            )}
            {lowCount > 0 && (
              <View style={[s.summaryBadge, { backgroundColor: '#FFFBEB' }]}>
                <Text style={[s.summaryText, { color: '#D97706' }]}>
                  {lowCount} {t('dashboard.inventory.low')}
                </Text>
              </View>
            )}
          </View>
        </View>
        <Pressable onPress={goToInventory} style={s.viewAllBtn} accessibilityRole="button">
          <Text style={s.viewAll}>{t('dashboard.inventory.viewAll')}</Text>
        </Pressable>
      </View>

      {/* Alert items */}
      {alertItems.map((item: InventoryItem) => (
        <StockRow key={item.id} item={item} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: { flex: 1, gap: 4 },
  title: { fontSize: 10, fontWeight: '700', color: '#111827', marginBottom: 3 },
  summaryRow: { flexDirection: 'row', gap: 4 },
  summaryBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  summaryText: { fontSize: 8, fontWeight: '700' },
  viewAllBtn: { minHeight: 28, justifyContent: 'center' },
  viewAll: { fontSize: 9, fontWeight: '600', color: '#1A6B3C' },
});
