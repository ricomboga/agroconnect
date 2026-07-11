// TODO(real-data): finance-service's farmer report (GET /finance/lender/loans/:id/report) has no
// activitySummary/streak/plots/riskFlags/loanHistory data — those live in farm-service/auth-service
// tables not yet joined into the report. This module provides the exact seed numbers documented in
// docs/ui-design-reference.md (Jane Wanjiru, June 2025) so the Farmer Report screens can be built
// and verified end-to-end; swap for a real join once farm-service exposes this data to finance-service.
export function buildMockFarmerReport(farmerId: string) {
  return {
    farmerId,
    farmer: {
      id: farmerId,
      fullName: 'Jane Wanjiru',
      phone: '+254712345678',
      county: 'Nakuru',
      subCounty: 'Nakuru Town',
      farmerType: 'both' as const,
      memberSince: '2025-01-15T00:00:00.000Z',
      kycStatus: 'verified',
    },
    creditScore: {
      score: 73,
      band: 'B',
      maxLoanKes: 200000,
      seasonsOfData: 3,
      breakdown: {
        harvestYieldScore: 21,
        inputManagementScore: 18,
        activityComplianceScore: 20,
        platformEngagementScore: 14,
      },
    },
    farm: {
      name: 'Nakuru Farm',
      areaAcres: 2.5,
      county: 'Nakuru',
      soilType: 'loam',
      waterSource: 'rain',
      locationLat: -0.3031,
      locationLng: 36.08,
      plots: [
        { name: 'Plot A', areaAcres: 1.5, currentCrop: 'Maize (H614D)', plantedAt: '2025-04-01' },
        { name: 'Plot B', areaAcres: 0.5, currentCrop: 'Cabbage', plantedAt: '2025-05-01' },
        { name: 'Plot C', areaAcres: 0.5, currentCrop: 'Beans', plantedAt: '2025-06-01' },
      ],
    },
    activitySummary: {
      totalActivitiesLast90Days: 19,
      completedOnTime: 17,
      overdueAtQuery: 2,
      completionRatePct: 89,
      streakDays: 12,
      recentCompleted: [
        { date: '2025-06-05', title: 'Watering — Maize', costKes: 500 },
        { date: '2025-06-04', title: 'Spray Mancozeb — Tomato', costKes: 960 },
        { date: '2025-06-01', title: '1st Fertiliser CAN 50kg — Maize', costKes: 3200 },
      ],
    },
    overdueActivities: ['Water Cabbage — 3 days overdue', 'Newcastle Vaccine — 7 days overdue'],
    harvestHistory: [
      { season: 'Sep 2024', crop: 'Maize H614D', quantityKg: 800, revenueKes: 28000, costsKes: 8400, profitKes: 19600, harvestDate: '2024-09-15' },
      { season: 'Jan 2025', crop: 'Cabbage', quantityKg: 420, revenueKes: 13300, costsKes: 5100, profitKes: 8200, harvestDate: '2025-01-20' },
    ],
    // TODO(real-data): mirrors farm-service's InventoryItem shape (purchasedQty/usedQty/unit) —
    // swap for a real GET /farms/{farmId}/inventory?as_at= call once the lender report joins to
    // farm-service inventory records.
    inventory: [
      {
        name: 'CAN Fertiliser 50kg',
        category: 'input',
        unit: 'bags',
        purchasedQty: 10,
        purchasedAt: '2025-03-01',
        usageLog: [
          { usedQty: 3, usedAt: '2025-04-05' },
          { usedQty: 2, usedAt: '2025-05-10' },
        ],
      },
      {
        name: 'Mancozeb Fungicide',
        category: 'input',
        unit: 'litres',
        purchasedQty: 8,
        purchasedAt: '2025-02-15',
        usageLog: [
          { usedQty: 8, usedAt: '2025-06-01' },
        ],
      },
      {
        name: 'Maize Seed (H614D)',
        category: 'input',
        unit: 'kg',
        purchasedQty: 25,
        purchasedAt: '2025-03-20',
        usageLog: [
          { usedQty: 25, usedAt: '2025-04-01' },
        ],
      },
    ],
    // TODO(real-data): no Machinery/Equipment model exists in farm-service yet — this section
    // documents the shape (acquiredAt/disposedAt/condition) a future model should expose so the
    // lender "as at date" snapshot can be computed the same way inventory is here.
    machinery: [
      { name: 'Petrol Water Pump', type: 'irrigation', condition: 'good', acquiredAt: '2025-01-10', disposedAt: null },
      { name: 'Ox Plough', type: 'tillage', condition: 'fair', acquiredAt: '2024-08-01', disposedAt: null },
      { name: 'Knapsack Sprayer (16L)', type: 'spraying', condition: 'good', acquiredAt: '2025-02-01', disposedAt: null },
      { name: 'Hand Hoe (old)', type: 'tillage', condition: 'worn', acquiredAt: '2023-05-01', disposedAt: '2025-03-15' },
    ],
    // Superset alias so this payload also satisfies the real FarmerFinancialReport shape used
    // to embed a report inside a loan/grant application decision screen.
    transactions: { totalIncomeKes: 16000, totalExpenseKes: 10060, netKes: 5940, recordCount: 4, byCategory: [], byMonth: [] },
    production: {
      cropHarvests: {
        totalHarvestedKg: 1220,
        totalSoldKg: 1220,
        totalRevenueKes: 41300,
        byCrop: [
          { cropName: 'Maize H614D', harvestedKg: 800, soldKg: 800, revenueKes: 28000 },
          { cropName: 'Cabbage', harvestedKg: 420, soldKg: 420, revenueKes: 13300 },
        ],
      },
      animalProducts: { byType: [] },
      collections: { totalSalesKes: 1950, paidKes: 0, pendingKes: 1950, byProductType: [] },
    },
    cashFlow: { last30DaysIncomeKes: 16000, last30DaysExpensesKes: 10060, last30DaysNetKes: 5940 },
    loanHistory: [
      {
        lender: 'Equity Bank Kenya',
        amountKes: 80000,
        status: 'active',
        disbursedAt: '2025-06-04',
        paymentsCompleted: 4,
        termMonths: 12,
        onTimePayments: 4,
      },
    ],
    riskFlags: ['Newcastle vaccine overdue 7 days', 'Mancozeb stock empty'],
    generatedAt: new Date().toISOString(),
  }
}

export type MockFarmerReport = ReturnType<typeof buildMockFarmerReport>
