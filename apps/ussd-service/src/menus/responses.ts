// Every string in this object is tested for ≤ 182 chars in tests/ussd.length.test.ts.
// Run that test after any change here before deploying.
export const RESPONSES = {
  // 96 chars
  MAIN_MENU:
    'CON Welcome to AgroConnect\n1. Farm Records\n2. Diagnose Crop\n3. Market Prices\n4. Loans\n5. Weather',

  // 71 chars
  FARM_RECORDS_MENU:
    'CON Farm Records\n1. Log Activity\n2. Log Harvest\n3. View Summary\n0. Back',

  // 68 chars
  LOG_ACTIVITY_PROMPT:
    'CON Enter activity:\n(e.g. Planted maize, Applied fertilizer)\n0. Back',

  // 56 chars
  LOG_ACTIVITY_SAVED: 'END Activity logged. Dial *384*123# to add more records.',

  // 54 chars
  LOG_HARVEST_PROMPT: 'CON Enter harvest:\n(e.g. 50kg maize on Plot A)\n0. Back',

  // 56 chars
  LOG_HARVEST_SAVED: 'END Harvest logged. Dial *384*123# to view your summary.',

  // 93 chars
  VIEW_SUMMARY:
    'END Farm Summary\nActivities this week: 3\nLast harvest: 50kg maize\nDial back for full records.',

  // 63 chars
  DIAGNOSE_PROMPT:
    'CON Describe the crop problem.\nWe will forward it to an expert.',

  // 84 chars
  DIAGNOSE_SENT:
    'END Report sent to an agricultural expert.\nYou will receive an SMS with advice soon.',

  // 75 chars
  MARKET_PRICES_MENU:
    'CON Market Prices\n1. Maize\n2. Beans\n3. Tomatoes\n4. Potatoes\n5. More\n0. Back',

  // 78 chars
  MARKET_MORE_MENU:
    'CON More Prices\n1. Sorghum\n2. Millet\n3. Cassava\n4. Sugarcane\n5. Onions\n0. Back',

  // 82 chars
  MAIZE_PRICE:
    'END Maize: KSh 3,800/90kg\nNairobi KSh 4,200 | Kisumu KSh 3,600\nSource: AMIS Kenya',

  // 83 chars
  BEANS_PRICE:
    'END Beans: KSh 8,500/90kg\nNairobi KSh 9,000 | Mombasa KSh 8,200\nSource: AMIS Kenya',

  // 86 chars
  TOMATOES_PRICE:
    'END Tomatoes: KSh 2,500/crate\nNairobi KSh 2,800 | Nakuru KSh 2,200\nSource: AMIS Kenya',

  // 85 chars
  POTATOES_PRICE:
    'END Potatoes: KSh 1,500/50kg\nNairobi KSh 1,800 | Kisumu KSh 1,400\nSource: AMIS Kenya',

  // 85 chars
  SORGHUM_PRICE:
    'END Sorghum: KSh 2,800/90kg\nNairobi KSh 3,000 | Eldoret KSh 2,600\nSource: AMIS Kenya',

  // 83 chars
  MILLET_PRICE:
    'END Millet: KSh 3,200/90kg\nNairobi KSh 3,500 | Kisumu KSh 3,000\nSource: AMIS Kenya',

  // 85 chars
  CASSAVA_PRICE:
    'END Cassava: KSh 1,200/50kg\nNairobi KSh 1,400 | Mombasa KSh 1,100\nSource: AMIS Kenya',

  // 87 chars
  SUGARCANE_PRICE:
    'END Sugarcane: KSh 5,000/tonne\nNairobi KSh 5,500 | Kisumu KSh 4,800\nSource: AMIS Kenya',

  // 83 chars
  ONIONS_PRICE:
    'END Onions: KSh 3,500/50kg\nNairobi KSh 4,000 | Nakuru KSh 3,200\nSource: AMIS Kenya',

  // 72 chars
  LOANS_MENU: 'CON Loans\n1. Check Credit Score\n2. Apply for Loan\n3. Loan Status\n0. Back',

  // 88 chars
  CREDIT_SCORE_REQUEST:
    'END Calculating your credit score.\nYou will receive an SMS with your score in 5 minutes.',

  // 64 chars
  LOAN_APPLY_PROMPT: 'CON Enter loan amount in KSh:\n(Min: 1,000 | Max: 50,000)\n0. Back',

  // 89 chars
  LOAN_APPLY_SENT:
    'END Loan application submitted.\nYou will receive an SMS with your application status soon.',

  // 98 chars
  LOAN_STATUS:
    'END Loan Status: Active\nAmount: KSh 5,000\nDisbursed: 01 Jun 2026\nDue: 01 Jul 2026\nOwing: KSh 3,200',

  // 92 chars
  LOAN_NO_ACTIVE:
    'END No active loans found.\nDial *384*123# and select Loans > Apply to apply for a loan.',

  // 114 chars
  WEATHER_RESULT:
    'END Today: Partly cloudy, 24C, 60% humidity\nTomorrow: Light rain expected\nOutlook: Dry spell. Good for harvesting.',

  // 58 chars
  INVALID_OPTION: 'CON Invalid option. Please try again.\n0. Back to Main Menu',

  // 60 chars
  GENERIC_ERROR: 'END Service temporarily unavailable. Please try again later.',
} as const;

export type ResponseKey = keyof typeof RESPONSES;
