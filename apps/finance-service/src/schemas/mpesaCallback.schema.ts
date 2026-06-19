import { z } from 'zod';

const callbackItemSchema = z.object({
  Name: z.string(),
  Value: z.union([z.string(), z.number()]).optional(),
});

export const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number().int(),
      ResultDesc: z.string(),
      CallbackMetadata: z
        .object({ Item: z.array(callbackItemSchema) })
        .optional(),
    }),
  }),
});

export type MpesaCallbackDto = z.infer<typeof mpesaCallbackSchema>;
