# AgroConnect — Screen Map & Navigation Reference

This file tells Claude Code: what screen is where, how to navigate, what each screen renders.
Reference in prompts: @docs/screen-map.md

---

## Mobile App — Bottom Tab Navigation

```
Tab 1: Home        → DashboardScreen
Tab 2: Farm        → FarmListScreen  (then → FarmProfileScreen → ActivityLogModal)
Tab 3: Finance     → FinanceHomeScreen   [HIDDEN for farm_worker role]
       OR Diagnose → DiagnosisHomeScreen [SHOWN for farm_worker role]
Tab 4: Stock       → InventoryScreen     [HIDDEN for farm_worker role]
       OR Community→ CommunityScreen     [SHOWN for farm_worker role]
Tab 5: Me          → ProfileScreen
```

## Mobile App — Screen Files & Navigation Paths

```
Screen file                                          Navigated to via
─────────────────────────────────────────────────────────────────────
src/screens/Auth/LoginScreen.tsx                     App start (unauthenticated)
src/screens/Auth/SetPINScreen.tsx                    After login (first time)
src/screens/Auth/OnboardingScreen.tsx                After PIN set

src/screens/Dashboard/DashboardScreen.tsx            Tab 1 (Home)

src/screens/Farm/FarmListScreen.tsx                  Tab 2 (Farm)
src/screens/Farm/FarmProfileScreen.tsx               FarmListScreen → "View Details"
src/screens/Farm/ActivityLogModal.tsx                FarmProfileScreen MyTasks → "Log Now"
                                                     FarmListScreen → "Log Activity"

src/screens/Finance/FinanceHomeScreen.tsx            Tab 3 (Finance) — farmer only
src/screens/Finance/AddTransactionScreen.tsx         FinanceHomeScreen → "+"
src/screens/Finance/LoansScreen.tsx                  FinanceHomeScreen → Loans tab

src/screens/Inventory/InventoryScreen.tsx            Tab 4 (Stock) — farmer only
src/screens/Inventory/AddInventoryItemScreen.tsx     InventoryScreen → "+"
src/screens/Inventory/modals/RecordInputUseModal.tsx InventoryScreen card → "Record Use"
src/screens/Inventory/modals/RestockItemModal.tsx    InventoryScreen card → "Restock"
src/screens/Inventory/modals/RecordProductModal.tsx  InventoryScreen Products tab
src/screens/Inventory/modals/AddCollectionModal.tsx  InventoryScreen Collections tab

src/screens/Diagnosis/DiagnosisHomeScreen.tsx        Tab 3 (Diagnose) — worker + farmer
src/screens/Diagnosis/DiagnosisInputScreen.tsx       DiagnosisHomeScreen → entry mode
src/screens/Diagnosis/DiagnosisResultScreen.tsx      After AI processing

src/screens/Community/CommunityFeedScreen.tsx        Tab 4 (Community) — worker + farmer
src/screens/Community/ThreadDetailScreen.tsx         CommunityFeedScreen → post
src/screens/Community/NewPostScreen.tsx              CommunityFeedScreen → "✏️"

src/screens/Profile/ProfileScreen.tsx                Tab 5 (Me)

src/screens/Govt/GovtServicesScreen.tsx              Profile → "Government Services"
                                                     OR Community tab (some configs)
```

## Mobile App — FarmProfileScreen Sub-Tabs

```
FarmProfileScreen has 3 sub-tabs (for role='farmer'):
  activeTab === 'overview'  → Overview content (stats + map + AI care cards)
  activeTab === 'mytasks'   → My Tasks content (overdue + today + this week + done)
  activeTab === 'workers'   → Workers content (worker list + task distribution)

For role='farm_worker':
  No sub-tabs shown
  Content: only My Tasks, filtered to assignedToWorkerId === currentUserId
  Role banner shown instead of sub-tabs
```

## Mobile App — ActivityLogModal

```
This is a React Native Modal (not a stack screen).
It slides up from the bottom as a bottom sheet.
Called from:
  - FarmProfileScreen MyTasks tab → any "Log Now" / "Log ✓" button
  - FarmListScreen → "Log Activity" button on a farm card
  - Dashboard → "Log Activity" quick action tile

Receives via navigation params:
  activityId: string (if opening for a specific scheduled activity)
  farmId: string
  preFilledType?: string (optional — for unscheduled quick logs)

On success:
  Invalidates React Query keys:
    ['farms/schedule', farmId]
    ['farms', user.id]
    ['streak']
  Shows success toast
  Calls navigation.goBack()
```

## Mobile App — User Role Routing

```
user.role === 'farmer':
  Bottom tabs: Home | Farm | Finance | Stock | Me
  FarmProfileScreen: shows all 3 sub-tabs (Overview, My Tasks, Workers)
  Can see: all financial data, full farm schedule, all workers
  Cannot do: create farms (web only), manage workers (web only)

user.role === 'farm_worker':
  Bottom tabs: Home | Farm | Diagnose | Community | Me
  Finance tab: HIDDEN
  Stock tab: HIDDEN
  FarmProfileScreen: NO sub-tabs, only My Tasks filtered to this worker
  Can see: only their assigned activities
  Cannot see: financial data, other workers' tasks, farm owner's full schedule
  Farm list: shows only farms where userId is in farm.workers[]

user.role === 'admin':
  Uses web portal at apps/web/
  No mobile app access (or read-only if implemented)
```

## Web Portal — Routes & Pages

```
/login                                   → LoginPage (all web users)

/farms/new                               → CreateFarmPage  ← FARM CREATION IS HERE
/farms/:farmId                           → FarmDetailPage (4 tabs: Overview, Plots & Crops, Workers, Schedule)
/farms/:farmId/edit                      → EditFarmPage

/admin/dashboard                         → AdminDashboardPage
/admin/users                             → UserManagementPage
/admin/users/new                         → CreateUserPage  ← ALL USER CREATION IS HERE
/admin/users/:userId                     → FarmerDetailPage
/admin/moderation                        → ContentModerationPage

/lender/loans                            → LoanPipelinePage
/lender/loans/:loanId                    → LoanApplicationDetailPage

/market                                  → PublicMarketPage (no login required)
/market/listings/:id                     → ListingDetailPage (no login required)
```

## Data Flow Between Screens

```
Farm creation on web → farm.created Kafka event → farm appears in FarmListScreen on mobile

Crop saved on web (POST /farms/:farmId/plots/:plotId/crop)
  → generateCropSchedule() runs server-side
  → 30-40 Activity records created automatically
  → appear in FarmProfileScreen My Tasks on mobile

Activity completed on mobile (ActivityLogModal PATCH)
  → farm.activity.completed Kafka event
  → notification-service sends push to assigned worker
  → credit score component incremented
  → streak updated
  → React Query cache invalidated on mobile

Worker added on web (POST /farms/:farmId/workers)
  → farm.worker.assigned Kafka event
  → notification-service sends push to new worker
  → worker's FarmListScreen now includes this farm
```

## React Query Keys (MUST be consistent across all screens)

```
Farms list:              ['farms', user.id]
Farm detail:             ['farms', farmId]
Farm schedule:           ['farms/schedule', farmId]
Farm workers:            ['farms/workers', farmId]
Streak:                  ['streak']
Dashboard data:          uses ['farms', user.id] + ['finance/summary'] + ['credit-score'] + ['nudges']
Finance monthly summary: ['finance/summary', 'current-month']
Credit score:            ['credit-score']
Nudges (AI):             ['nudges']
Price alerts:            ['price-alerts']
Inventory inputs:        ['inventory', 'inputs', farmId]
Animal products:         ['inventory', 'animal-products', farmId]
Collections:             ['inventory', 'collections', farmId]
Inventory summary:       ['inventory', 'summary']
Community posts:         ['community', 'posts', { category }]
Thread:                  ['community', 'thread', threadId]
Achievements:            ['achievements']
Diagnoses:               ['diagnoses', 'history']
```

## API Endpoints Referenced in Mobile Screens

```
GET  /api/v1/farms                             → FarmListScreen, DashboardScreen
GET  /api/v1/farms/:farmId                     → FarmProfileScreen
GET  /api/v1/farms/:farmId/schedule            → FarmProfileScreen My Tasks
GET  /api/v1/farms/:farmId/workers             → FarmProfileScreen Workers tab
GET  /api/v1/farms/streak                      → DashboardScreen, ActivityLogModal
GET  /api/v1/farms/recommendations             → DashboardScreen AI nudge cards
PATCH /api/v1/farms/:farmId/activities/:id     → ActivityLogModal (complete/skip)

GET  /api/v1/finance/transactions/monthly-summary  → DashboardScreen, FinanceHomeScreen
GET  /api/v1/finance/credit-score              → DashboardScreen
GET  /api/v1/finance/transactions              → FinanceHomeScreen
POST /api/v1/finance/transactions              → AddTransactionScreen

GET  /api/v1/inventory/inputs                  → InventoryScreen Inputs tab
POST /api/v1/inventory/inputs                  → AddInventoryItemScreen
POST /api/v1/inventory/inputs/:id/use          → RecordInputUseModal
POST /api/v1/inventory/inputs/:id/restock      → RestockItemModal
GET  /api/v1/inventory/animal-products         → InventoryScreen Products tab
POST /api/v1/inventory/animal-products         → RecordProductModal
GET  /api/v1/inventory/collections             → InventoryScreen Collections tab
PATCH /api/v1/inventory/collections/:id/pay   → Collections tab "Mark Paid"
GET  /api/v1/inventory/summary                 → DashboardScreen widget

POST /api/v1/diagnose                          → DiagnosisInputScreen
GET  /api/v1/diagnose/history                  → DiagnosisHomeScreen
PATCH /api/v1/diagnose/:id/link-to-farm        → DiagnosisResultScreen

GET  /api/v1/community/threads                 → CommunityFeedScreen
GET  /api/v1/community/threads/:id             → ThreadDetailScreen
POST /api/v1/community/threads                 → NewPostScreen
POST /api/v1/community/threads/:id/replies     → ThreadDetailScreen reply input

GET  /api/v1/weather/forecast                  → DashboardScreen weather card
GET  /api/v1/market/prices/alerts              → DashboardScreen price alert
```
