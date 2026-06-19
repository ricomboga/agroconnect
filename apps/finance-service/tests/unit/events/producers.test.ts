import * as loanAppliedProducer from '../../../src/events/producers/loanAppliedProducer';
import * as loanDisbursedProducer from '../../../src/events/producers/loanDisbursedProducer';
import * as paymentFailedProducer from '../../../src/events/producers/paymentFailedProducer';

let capturedProducer: { send: jest.Mock; disconnect: jest.Mock };

jest.mock('@agroconnect/kafka', () => ({
  createProducer: jest.fn().mockImplementation(() => {
    capturedProducer = { send: jest.fn(), disconnect: jest.fn() };
    return Promise.resolve(capturedProducer);
  }),
}));

beforeEach(() => {
  if (capturedProducer) {
    capturedProducer.send.mockReset();
    capturedProducer.disconnect.mockReset();
  }
});

describe('publishLoanApplied', () => {
  it('sends message to finance.loan.applied topic', async () => {
    await loanAppliedProducer.publishLoanApplied('loan-1', 'farmer-1', 'farm-1', 'working_capital', 50000);

    expect(capturedProducer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'finance.loan.applied',
        messages: expect.arrayContaining([
          expect.objectContaining({
            key: 'farmer-1',
            value: expect.stringContaining('"loanId":"loan-1"'),
          }),
        ]),
      }),
    );
    expect(capturedProducer.disconnect).toHaveBeenCalled();
  });
});

describe('publishLoanDisbursed', () => {
  it('sends message to finance.loan.disbursed topic', async () => {
    await loanDisbursedProducer.publishLoanDisbursed('loan-1', 'farmer-1', 'farm-1', 50000, 'MP-REF-001');

    expect(capturedProducer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'finance.loan.disbursed',
        messages: expect.arrayContaining([
          expect.objectContaining({
            key: 'farmer-1',
            value: expect.stringContaining('"loanId":"loan-1"'),
          }),
        ]),
      }),
    );
    expect(capturedProducer.disconnect).toHaveBeenCalled();
  });

  it('disconnects even when send throws', async () => {
    jest.mocked(require('@agroconnect/kafka').createProducer).mockImplementationOnce(() => {
      capturedProducer = {
        send: jest.fn().mockRejectedValue(new Error('Kafka unavailable')),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      return Promise.resolve(capturedProducer);
    });

    await expect(
      loanDisbursedProducer.publishLoanDisbursed('loan-1', 'farmer-1', 'farm-1', 50000, 'MP-REF-001'),
    ).rejects.toThrow('Kafka unavailable');

    expect(capturedProducer.disconnect).toHaveBeenCalled();
  });
});

describe('publishPaymentFailed', () => {
  it('sends message to finance.payment.failed topic', async () => {
    await paymentFailedProducer.publishPaymentFailed('loan-1', 'farmer-1', 1032, 'Request cancelled by user');

    expect(capturedProducer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'finance.payment.failed',
        messages: expect.arrayContaining([
          expect.objectContaining({
            key: 'farmer-1',
            value: expect.stringContaining('"resultCode":1032'),
          }),
        ]),
      }),
    );
    expect(capturedProducer.disconnect).toHaveBeenCalled();
  });

  it('disconnects even when send throws', async () => {
    jest.mocked(require('@agroconnect/kafka').createProducer).mockImplementationOnce(() => {
      capturedProducer = {
        send: jest.fn().mockRejectedValue(new Error('Kafka unavailable')),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      return Promise.resolve(capturedProducer);
    });

    await expect(
      paymentFailedProducer.publishPaymentFailed('loan-1', 'farmer-1', 1032, 'cancelled'),
    ).rejects.toThrow('Kafka unavailable');

    expect(capturedProducer.disconnect).toHaveBeenCalled();
  });
});
