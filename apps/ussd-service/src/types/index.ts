export interface UssdRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  networkCode: string;
  text: string;
}

export interface SessionData {
  phoneNumber: string;
  currentMenu: string;
  lastSeen: number;
}

export type MenuState =
  | 'main'
  | 'farm_records'
  | 'farm_log_activity'
  | 'farm_log_harvest'
  | 'diagnose'
  | 'market_prices'
  | 'market_more'
  | 'loans'
  | 'loan_apply';
