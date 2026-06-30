import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { useInputs } from '../../hooks/useInputs';
import type { Input } from '../../api/input';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { EmptyState } from '../../components/Common/EmptyState';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { FAB } from '../../components/Common/FAB';
import { InputListItem } from '../../components/Input/InputListItem';
import { SeasonFilterBar } from '../../components/Input/SeasonFilterBar';
import { CostSummaryCard } from '../../components/Input/CostSummaryCard';

type Props = NativeStackScreenProps<FarmStackParamList, 'InputLog'>;

export function InputLogScreen({ navigation, route }: Props) {
  const { farmId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [season, setSeason] = useState(new Date().getFullYear());

  const { data, isLoading, isError, refetch } = useInputs({ farmId, season });

  const inputs = data?.data ?? [];
  const totalCostKes = useMemo(
    () => inputs.reduce((sum: number, i: Input) => sum + i.totalCostKes, 0),
    [inputs],
  );

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen onRetry={refetch} />;

  return (
    <View style={styles.flex}>
      {!isOnline && <OfflineBanner />}
      <SeasonFilterBar selectedSeason={season} onSelect={setSeason} />
      {inputs.length > 0 && <CostSummaryCard totalCostKes={totalCostKes} />}
      {inputs.length === 0 ? (
        <EmptyState
          title={t('input.log.empty.title')}
          body={t('input.log.empty.body')}
          ctaLabel={t('input.log.empty.cta')}
          onCta={() => navigation.navigate('InputForm', { farmId })}
        />
      ) : (
        <FlatList
          data={inputs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <InputListItem input={item} />}
          contentContainerStyle={styles.list}
        />
      )}
      <FAB onPress={() => navigation.navigate('InputForm', { farmId })} label="+" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAFA' },
  list: { paddingBottom: 80 },
});
