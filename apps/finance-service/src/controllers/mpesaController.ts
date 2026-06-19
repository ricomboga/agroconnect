import { Request, Response, NextFunction } from 'express';
import * as loanRepo from '../repositories/loanRepository.js';
import { validateCallback } from '../services/mpesaService.js';
import { publishLoanDisbursed } from '../events/producers/loanDisbursedProducer.js';
import { publishPaymentConfirmed } from '../events/producers/paymentConfirmedProducer.js';
import { publishPaymentFailed } from '../events/producers/paymentFailedProducer.js';
import { mpesaCallbackSchema } from '../schemas/mpesaCallback.schema.js';
import { logger } from '../logger.js';

function extractMetaValue(
  items: Array<{ Name: string; Value?: string | number }>,
  name: string,
): string | undefined {
  const item = items.find((i) => i.Name === name);
  return item?.Value !== undefined ? String(item.Value) : undefined;
}

export async function handleMpesaCallback(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  // Always return 200 to prevent Safaricom from retrying on any processing error.
  // Errors are audit-logged and swallowed.

  // --- Validate IP + HMAC signature ---
  const { valid, reason } = validateCallback(
    req.body,
    req.headers as Record<string, string | string[] | undefined>,
  );

  if (!valid) {
    logger.warn(
      {
        reason,
        ip: req.headers['x-forwarded-for'] ?? req.socket.remoteAddress,
        path: req.path,
        method: req.method,
        headers: req.headers,
        body: req.body,
      },
      'Invalid M-Pesa callback — possible security event',
    );
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  // --- Parse body (body was not validated by middleware — validate here) ---
  const parsed = mpesaCallbackSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn(
      { errors: parsed.error.flatten(), body: req.body },
      'Malformed M-Pesa callback body — ignoring',
    );
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  const { stkCallback } = parsed.data.Body;
  const merchantId = stkCallback.MerchantRequestID;

  // Market order payments use the prefix "order_<orderId>" so they can share
  // the same M-Pesa callback endpoint without a separate route.
  if (merchantId.startsWith('order_')) {
    const orderId = merchantId.slice('order_'.length);
    const items = stkCallback.CallbackMetadata?.Item ?? [];
    const mpesaRef =
      extractMetaValue(items, 'MpesaReceiptNumber') ?? stkCallback.CheckoutRequestID;

    if (stkCallback.ResultCode === 0) {
      const amountKes = Number(extractMetaValue(items, 'Amount') ?? 0);
      const farmerId = extractMetaValue(items, 'PhoneNumber') ?? '';
      await publishPaymentConfirmed(orderId, farmerId, amountKes, mpesaRef);
      logger.info({ orderId, mpesaRef }, 'Market order payment confirmed via M-Pesa');
    } else {
      logger.warn(
        { orderId, resultCode: stkCallback.ResultCode, desc: stkCallback.ResultDesc },
        'Market order M-Pesa payment failed',
      );
    }
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  const loanId = merchantId;

  try {
    const loan = await loanRepo.findLoanById(loanId);

    if (!loan) {
      logger.warn({ loanId }, 'M-Pesa callback for unknown loan — ignoring');
      res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
      return;
    }

    if (stkCallback.ResultCode === 0) {
      // --- Success callback ---

      // Idempotency: skip if already processed
      if (loan.status === 'disbursed') {
        logger.info({ loanId }, 'Duplicate M-Pesa success callback — already disbursed, skipping');
        res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
        return;
      }

      const items = stkCallback.CallbackMetadata?.Item ?? [];
      const mpesaRef =
        extractMetaValue(items, 'MpesaReceiptNumber') ?? stkCallback.CheckoutRequestID;

      await loanRepo.updateLoanDisbursed(loanId, mpesaRef);

      await publishLoanDisbursed(
        loanId,
        loan.farmerId,
        loan.farmId,
        Number(loan.amountRequestedKes),
        mpesaRef,
      );

      logger.info({ loanId, mpesaRef }, 'Loan disbursed via M-Pesa');
    } else {
      // --- Failure callback ---

      // Idempotency: skip if already in a terminal failure state
      if (loan.status === 'rejected') {
        logger.info(
          { loanId, resultCode: stkCallback.ResultCode },
          'Duplicate M-Pesa failure callback — already rejected, skipping',
        );
        res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
        return;
      }

      await loanRepo.updateLoanFailed(loanId, stkCallback.ResultDesc);

      await publishPaymentFailed(
        loanId,
        loan.farmerId,
        stkCallback.ResultCode,
        stkCallback.ResultDesc,
      );

      logger.info(
        { loanId, resultCode: stkCallback.ResultCode, desc: stkCallback.ResultDesc },
        'M-Pesa STK push failed — loan rejected',
      );
    }
  } catch (err) {
    // Log but still return 200 so Safaricom does not retry
    logger.error({ err, loanId }, 'Unexpected error processing M-Pesa callback');
  }

  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
