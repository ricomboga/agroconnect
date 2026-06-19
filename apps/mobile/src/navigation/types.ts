export type RootParamList = {
  Auth: undefined;
  App:  undefined;
};

export type AuthStackParamList = {
  LanguageSelect: undefined;
  Welcome:        undefined;
  Login:          undefined;
  Register:       undefined;
  OtpVerify:      { phone: string };
};

export type AppTabParamList = {
  Farm:      undefined;
  Diagnose:  undefined;
  Market:    undefined;
  Finance:   undefined;
  Community: undefined;
  Profile:   undefined;
  Govt:      undefined;
  Insights:  undefined;
};

export type FarmStackParamList = {
  FarmList:         undefined;
  FarmProfile:      { farmId: string };
  FarmSetupWizard:  undefined;
  ActivityCalendar: { farmId: string };
  ActivityForm:     { farmId: string; activityId?: string };
  InputLog:         { farmId: string };
  InputForm:        { farmId: string };
  HarvestLog:       { farmId: string };
  HarvestForm:      { farmId: string };
  WeatherDetail:    { lat?: number | null; lng?: number | null; county?: string | null };
};

export type DiagnoseStackParamList = {
  DiagnoseHome:       undefined;
  DiagnoseCamera:     { farmId: string };
  DiagnoseSubject:    { farmId: string; photoUris: string[] };
  DiagnoseLoading:    { diagnosisId: string; farmId: string };
  DiagnoseResult:     { diagnosisId: string; farmId: string };
  DiagnoseFeedback:   { diagnosisId: string };
  SupplierProducts:   { productName: string };
};

export type MarketStackParamList = {
  MarketHome:             undefined;
  ProduceListingDetail:   { listingId: string };
  CreateListing:          undefined;
  Cart:                   undefined;
  Checkout:               undefined;
  PriceAlerts:            undefined;
};

export type FinanceStackParamList = {
  FinanceHome:       undefined;
  CreditScoreDetail: undefined;
  LoanProducts:      undefined;
  LoanApplication:   { productId: string };
  LoanStatus:        { loanId: string };
};

export type CommunityStackParamList = {
  CommunityHome:  undefined;
  ThreadDetail:   { threadId: string };
  NewThread:      undefined;
  ExpertProfile:  { expertId: string };
  WeatherDetail:  { lat?: number | null; lng?: number | null; county?: string | null };
};

export type ProfileStackParamList = {
  ProfileHome:          undefined;
  EditProfile:          undefined;
  NotificationSettings: undefined;
  FarmSummaryExport:    undefined;
  OfflineStatus:        undefined;
};

export type GovtStackParamList = {
  GovtHome:      undefined;
  Registrations: undefined;
  Subsidies:     undefined;
  Licenses:      undefined;
};

export type InsightsStackParamList = {
  Insights: undefined;
};
