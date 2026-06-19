# Skill: React Native Screen

Read this file before creating or modifying any React Native screen.
Reference: `@.claude/skills/mobile-screen/SKILL.md`

## Every screen must have these five things

- [ ] `useOfflineSync()` hook wrapping all data fetching
- [ ] Loading state (skeleton or spinner)
- [ ] Error state (message + retry button)
- [ ] Empty state (illustration + action CTA)
- [ ] All text via i18n keys — zero hardcoded strings

If any of the five are missing, the screen is not complete.

## File naming and location

```
apps/mobile/src/screens/{Module}/
  FarmListScreen.tsx          ← PascalCase, ends in Screen
  FarmProfileScreen.tsx
  ActivityCalendarScreen.tsx

apps/mobile/src/components/{Module}/
  FarmCard.tsx                ← Reusable component, PascalCase
  ActivityListItem.tsx

apps/mobile/src/hooks/
  useFarmRecords.ts           ← camelCase, starts with use
  useOfflineSync.ts

apps/mobile/src/locales/
  sw.json                     ← Swahili (default)
  en.json                     ← English (fallback)
```

## Screen template

```tsx
import React from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useTranslation } from 'react-i18next';

export const FarmListScreen = () => {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmApi.list(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity, // don't refetch offline
  });

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('common.error.loadFailed')}</Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <Text>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>{t('farm.list.empty.title')}</Text>
        <Text style={styles.emptyBody}>{t('farm.list.empty.body')}</Text>
        <Pressable onPress={() => navigation.navigate('FarmSetupWizard')}>
          <Text>{t('farm.list.empty.cta')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FarmCard farm={item} />}
    />
  );
};
```

## useOfflineSync hook interface

```typescript
// apps/mobile/src/hooks/useOfflineSync.ts
export function useOfflineSync() {
  return {
    isOnline: boolean,              // current network status
    queueWrite: (op: QueuedOp) => void,  // queue a write for later
    pendingCount: number,           // how many ops are queued
    syncNow: () => Promise<void>,   // force sync attempt
  };
}
```

Use `isOnline` to decide whether to show a "working offline" banner.
Use `queueWrite` whenever a POST/PATCH/DELETE happens while offline — never silently drop user input.

## i18n key pattern

Keys are dot-separated: `{module}.{screen}.{element}`.

```json
// locales/sw.json
{
  "farm": {
    "list": {
      "title": "Mashamba yangu",
      "empty": {
        "title": "Huna shamba bado",
        "body": "Ongeza shamba lako la kwanza kuanza",
        "cta": "Ongeza shamba"
      }
    },
    "profile": {
      "area": "Ukubwa",
      "county": "Kaunti",
      "crop": "Zao"
    }
  },
  "common": {
    "retry": "Jaribu tena",
    "save": "Hifadhi",
    "cancel": "Ghairi",
    "error": {
      "loadFailed": "Imeshindwa kupakia. Angalia muunganisho wako."
    }
  }
}
```

```json
// locales/en.json (identical keys, English values)
{
  "farm": {
    "list": {
      "title": "My Farms",
      "empty": {
        "title": "No farms yet",
        "body": "Add your first farm to get started",
        "cta": "Add farm"
      }
    }
  }
}
```

## Tap target sizes (accessibility)

Every tappable element must be at least 48×48px. This is not optional.

```tsx
// Correct
<Pressable style={{ minHeight: 48, minWidth: 48, justifyContent: 'center' }}>
  <Text>Action</Text>
</Pressable>

// Wrong — too small on older Android devices
<Pressable style={{ padding: 4 }}>
  <Text>Action</Text>
</Pressable>
```

## Offline-first data patterns

### Reading data offline
```tsx
const { data } = useQuery({
  queryKey: ['farms'],
  queryFn: farmApi.list,
  // React Query serves cached data instantly, then refetches in background
  staleTime: 5 * 60 * 1000,
});
```

### Writing data offline
```typescript
// When a POST fails due to no connection, queue it
const submitActivity = async (data: CreateActivityDto) => {
  try {
    await farmApi.createActivity(farmId, data);
  } catch (err) {
    if (!isOnline) {
      queueWrite({
        id: uuid(),
        operation: 'CREATE',
        entity: 'activities',
        endpoint: `/api/v1/farms/${farmId}/activities`,
        payload: JSON.stringify(data),
        created_at: new Date().toISOString(),
        status: 'pending',
      });
      showToast(t('common.savedOffline')); // "Imehifadhiwa. Itasawazishwa mtandaoni"
    } else {
      throw err; // online failure — surface error normally
    }
  }
};
```

## USSD fallback trigger

For diagnosis and activity reminders, include a USSD fallback info block on the relevant screen for users who may switch to a feature phone:

```tsx
{!isOnline && (
  <View style={styles.ussdBanner}>
    <Text style={styles.ussdText}>
      {t('diagnosis.ussdFallback', { code: '*384*123#' })}
    </Text>
  </View>
)}
```

## Navigation param list pattern

```typescript
// Each stack/tab has a typed param list
export type FarmStackParamList = {
  FarmList: undefined;
  FarmProfile: { farmId: string };
  ActivityCalendar: { farmId: string };
  ActivityForm: { farmId: string; activityId?: string }; // optional = edit mode
  FarmSetupWizard: undefined;
};
```

Always type your navigation prop — never use `any` for navigation or route params.

## What NOT to do

- Never use AsyncStorage for structured data — use WatermelonDB
- Never fetch data directly in a component without React Query — no raw `useEffect` + `fetch`
- Never hardcode a string visible to the user — always an i18n key
- Never make a tappable element smaller than 48×48px
- Never show a blank screen — loading, error, and empty states are mandatory
- Never crash silently when offline — queue writes or show a clear message
