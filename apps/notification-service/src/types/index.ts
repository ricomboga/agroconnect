import { z } from 'zod';

// farm.created
export const FarmCreatedPayload = z.object({
  farmId: z.string(),
  ownerId: z.string(),
  county: z.string(),
  occurredAt: z.string(),
});
export type FarmCreatedPayload = z.infer<typeof FarmCreatedPayload>;

// farm.activity.completed
export const FarmActivityCompletedPayload = z.object({
  activityId: z.string(),
  farmId: z.string(),
  ownerId: z.string(),
  activityType: z.string(),
  occurredAt: z.string(),
});
export type FarmActivityCompletedPayload = z.infer<typeof FarmActivityCompletedPayload>;

// farm.harvest.recorded
export const FarmHarvestRecordedPayload = z.object({
  harvestId: z.string(),
  farmId: z.string(),
  ownerId: z.string(),
  crop: z.string(),
  quantityKg: z.number(),
  occurredAt: z.string(),
});
export type FarmHarvestRecordedPayload = z.infer<typeof FarmHarvestRecordedPayload>;

// diagnosis.completed
export const DiagnosisCompletedPayload = z.object({
  diagnosisId: z.string(),
  farmerId: z.string(),
  diseaseName: z.string(),
  severity: z.string().optional(),
  occurredAt: z.string(),
});
export type DiagnosisCompletedPayload = z.infer<typeof DiagnosisCompletedPayload>;

// finance.loan.applied
export const FinanceLoanAppliedPayload = z.object({
  loanId: z.string(),
  farmerId: z.string(),
  amountKes: z.number(),
  phone: z.string(),
  occurredAt: z.string(),
});
export type FinanceLoanAppliedPayload = z.infer<typeof FinanceLoanAppliedPayload>;

// finance.loan.disbursed
export const FinanceLoanDisbursedPayload = z.object({
  loanId: z.string(),
  farmerId: z.string(),
  amountKes: z.number(),
  phone: z.string(),
  occurredAt: z.string(),
});
export type FinanceLoanDisbursedPayload = z.infer<typeof FinanceLoanDisbursedPayload>;

// finance.payment.confirmed
export const FinancePaymentConfirmedPayload = z.object({
  paymentId: z.string(),
  farmerId: z.string(),
  amountKes: z.number(),
  phone: z.string(),
  orderId: z.string().optional(),
  occurredAt: z.string(),
});
export type FinancePaymentConfirmedPayload = z.infer<typeof FinancePaymentConfirmedPayload>;

// finance.payment.failed
export const FinancePaymentFailedPayload = z.object({
  paymentId: z.string(),
  farmerId: z.string(),
  amountKes: z.number(),
  phone: z.string(),
  reason: z.string().optional(),
  occurredAt: z.string(),
});
export type FinancePaymentFailedPayload = z.infer<typeof FinancePaymentFailedPayload>;

// market.listing.created
export const MarketListingCreatedPayload = z.object({
  listingId: z.string(),
  sellerId: z.string(),
  cropType: z.string(),
  pricePerKg: z.number(),
  occurredAt: z.string(),
});
export type MarketListingCreatedPayload = z.infer<typeof MarketListingCreatedPayload>;

// market.order.placed
export const MarketOrderPlacedPayload = z.object({
  orderId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  cropType: z.string(),
  totalKes: z.number(),
  occurredAt: z.string(),
});
export type MarketOrderPlacedPayload = z.infer<typeof MarketOrderPlacedPayload>;

// market.order.updated
export const MarketOrderUpdatedPayload = z.object({
  orderId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  status: z.string(),
  occurredAt: z.string(),
});
export type MarketOrderUpdatedPayload = z.infer<typeof MarketOrderUpdatedPayload>;

// govt.registration.submitted
export const GovtRegistrationSubmittedPayload = z.object({
  registrationId: z.string(),
  farmerId: z.string(),
  farmName: z.string(),
  occurredAt: z.string(),
});
export type GovtRegistrationSubmittedPayload = z.infer<typeof GovtRegistrationSubmittedPayload>;

// weather.alert.issued
export const WeatherAlertIssuedPayload = z.object({
  alertId: z.string(),
  county: z.string(),
  severity: z.string(),
  description: z.string(),
  occurredAt: z.string(),
});
export type WeatherAlertIssuedPayload = z.infer<typeof WeatherAlertIssuedPayload>;

// community.post.created
export const CommunityPostCreatedPayload = z.object({
  postId: z.string(),
  authorId: z.string(),
  category: z.string(),
  title: z.string(),
  occurredAt: z.string(),
});
export type CommunityPostCreatedPayload = z.infer<typeof CommunityPostCreatedPayload>;

// user.registered
export const UserRegisteredPayload = z.object({
  userId: z.string(),
  phone: z.string(),
  fullName: z.string(),
  county: z.string().optional(),
  occurredAt: z.string(),
});
export type UserRegisteredPayload = z.infer<typeof UserRegisteredPayload>;

// notification.send (generic pass-through)
export const NotificationSendPayload = z.object({
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  channel: z.enum(['push', 'sms']).default('push'),
  phone: z.string().optional(),
  language: z.string().optional(),
  fcmToken: z.string().optional(),
});
export type NotificationSendPayload = z.infer<typeof NotificationSendPayload>;
