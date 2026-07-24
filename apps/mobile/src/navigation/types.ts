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
  ForgotPin:      undefined;
  ResetPin:       { phone: string };
};

export type AppTabParamList = {
  Home:      undefined;
  Farm:      undefined;
  Diagnose:  undefined;
  Market:    undefined;
  Finance:   undefined;
  Inventory: undefined;
  Community:         undefined;
  FarmersCommunity:  undefined;
  Profile:           undefined;
  Govt:      undefined;
  Insights:  undefined;
};

export type FarmStackParamList = {
  FarmList:        undefined;
  FarmProfile:     { farmId: string; initialTab?: 'overview' | 'my_tasks' | 'workers' };
  EditFarmScreen:  { farmId: string };
  AddCropScreen:   { farmId: string };
  AddAnimalScreen: { farmId: string };
  AddWorkerScreen: { farmId: string };
  ActivityCalendar:  { farmId: string };
  ActivityForm:      { farmId?: string; activityId?: string; activityType?: string; cropName?: string; streak?: number };
  ActivityLogModal:  { farmId: string; activityId: string };
  InputLog:        { farmId: string };
  InputForm:       { farmId: string };
  HarvestLog:      { farmId: string };
  HarvestForm:     { farmId: string };
  WeatherDetail:   { lat?: number | null; lng?: number | null; county?: string | null };
};

export type DiagnoseStackParamList = {
  DiagnosisHome:   undefined;
  DiagnosisInput:  { mode: 'text' | 'photo' | 'both' };
  DiagnosisResult: { diagnosisId: string; farmId?: string };
  DiagnosisFeedback: { diagnosisId: string };
  SupplierProducts: { productName: string };
  SupplierProductDetail: { productId: string };
};

export type MarketStackParamList = {
  MarketHome:             undefined;
  ProduceListingDetail:   { listingId: string };
  CreateListing:          undefined;
  SupplierProductDetail:  { productId: string };
};

export type FinanceStackParamList = {
  FinanceHome:         undefined;
  AddTransaction:      undefined;
  LoanProducts:        undefined;
  LoanProductDetail:   { productId: string };
  LoanApplication:     { productId: string };
  LoanStatus:          { loanId: string };
};

export type CommunityStackParamList = {
  CommunityHome:          undefined;
  ThreadDetail:           { threadId: string };
  NewThread:              undefined;
  ExpertsList:            undefined;
  ExpertProfile:          { expertId: string };
  ArticlesList:           undefined;
  ArticleDetail:          { slug: string };
  WeatherDetail:          { lat?: number | null; lng?: number | null; county?: string | null };
  SupplierDirectory:      undefined;
  SupplierDirectoryProfile: { supplierId: string };
};

export type ProfileStackParamList = {
  ProfileHome:          undefined;
  EditProfile:          undefined;
  NotificationSettings: undefined;
  FarmSummaryExport:    undefined;
  OfflineStatus:        undefined;
};

export type GovtStackParamList = {
  GovtHome:        undefined;
  Registrations:   undefined;
  NewRegistration: undefined;
  Subsidies:       undefined;
  Licenses:        undefined;
  NewLicense:      undefined;
};

export type InsightsStackParamList = {
  Insights: undefined;
};

export type StockStackParamList = {
  InventoryHome: undefined;
  AddStockScreen: undefined;
  RestockScreen: { itemId: string; itemName: string; unit: string; remainingQty: number; supplier: string; costPerUnit: number };
  RecordUseScreen: { itemId: string; itemName: string; unit: string; remainingQty: number; supplier: string; costPerUnit: number };
  RecordAnimalProductScreen: { productType: string; existingId?: string; existingQty?: number; farmId: string; animalGroupId: string; pricePerUnit: number };
  RecordHarvestSaleScreen: { harvestId: string; cropName: string; remainingKg: number; estimatedPricePerKg: number };
  UpdateHarvestStockScreen: { harvestId: string; cropName: string; remainingKg: number };
  AddHarvestScreen: undefined;
  AddCollectionScreen: { productType?: string };
};
