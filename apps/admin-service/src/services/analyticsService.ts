import { logger } from '../logger.js';
import * as authClient from '../clients/authServiceClient.js';
import * as farmClient from '../clients/farmServiceClient.js';
import * as financeClient from '../clients/financeServiceClient.js';
import * as marketClient from '../clients/marketServiceClient.js';

export interface AnalyticsSummary {
  total_farmers: number;
  total_farms: number;
  diagnoses_this_month: number;
  loans_disbursed_kes: number;
  active_listings: number;
  pending_kyc: number;
  farms_health_below_50: number;
}

export async function getSummary(): Promise<AnalyticsSummary> {
  const [authResult, farmResult, financeResult, marketResult] = await Promise.allSettled([
    authClient.getStats(),
    farmClient.getStats(),
    financeClient.getStats(),
    marketClient.getStats(),
  ]);

  if (authResult.status === 'rejected') {
    logger.warn({ err: authResult.reason }, 'auth-service stats failed in summary');
  }
  if (farmResult.status === 'rejected') {
    logger.warn({ err: farmResult.reason }, 'farm-service stats failed in summary');
  }
  if (financeResult.status === 'rejected') {
    logger.warn({ err: financeResult.reason }, 'finance-service stats failed in summary');
  }
  if (marketResult.status === 'rejected') {
    logger.warn({ err: marketResult.reason }, 'market-service stats failed in summary');
  }

  const auth = authResult.status === 'fulfilled' ? authResult.value : { total_farmers: 0, pending_kyc: 0 };
  const farm =
    farmResult.status === 'fulfilled'
      ? farmResult.value
      : { total_farms: 0, diagnoses_this_month: 0, farms_health_below_50: 0 };
  const finance = financeResult.status === 'fulfilled' ? financeResult.value : { loans_disbursed_kes: 0 };
  const market = marketResult.status === 'fulfilled' ? marketResult.value : { active_listings: 0 };

  return {
    total_farmers: auth.total_farmers,
    total_farms: farm.total_farms,
    diagnoses_this_month: farm.diagnoses_this_month,
    loans_disbursed_kes: finance.loans_disbursed_kes,
    active_listings: market.active_listings,
    pending_kyc: auth.pending_kyc,
    farms_health_below_50: farm.farms_health_below_50,
  };
}
