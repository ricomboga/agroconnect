import { registerSchema } from '../../src/schemas/register.schema';
import { loginSchema } from '../../src/schemas/login.schema';
import { refreshSchema } from '../../src/schemas/refresh.schema';
import { otpSendSchema } from '../../src/schemas/otpSend.schema';
import { otpVerifySchema } from '../../src/schemas/otpVerify.schema';
import { updateMeSchema } from '../../src/schemas/updateMe.schema';

describe('registerSchema', () => {
  const valid = {
    phone: '+254712345678',
    password: 'password123',
    fullName: 'Jane Farmer',
    role: 'farmer' as const,
    language: 'sw' as const,
  };

  it('accepts a valid payload', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid phone format', () => {
    const r = registerSchema.safeParse({ ...valid, phone: '0712345678' });
    expect(r.success).toBe(false);
  });

  it('rejects +254 prefix that is not 7 or 1', () => {
    const r = registerSchema.safeParse({ ...valid, phone: '+254812345678' });
    expect(r.success).toBe(false);
  });

  it('accepts +2541xxxxxxxx (Safaricom 010/011 range)', () => {
    const r = registerSchema.safeParse({ ...valid, phone: '+254112345678' });
    expect(r.success).toBe(true);
  });

  it('rejects password shorter than 8 chars', () => {
    const r = registerSchema.safeParse({ ...valid, password: 'short' });
    expect(r.success).toBe(false);
  });

  it('rejects fullName shorter than 2 chars', () => {
    const r = registerSchema.safeParse({ ...valid, fullName: 'J' });
    expect(r.success).toBe(false);
  });

  it('rejects an unknown role', () => {
    const r = registerSchema.safeParse({ ...valid, role: 'superuser' });
    expect(r.success).toBe(false);
  });

  it('accepts an optional email', () => {
    const r = registerSchema.safeParse({ ...valid, email: 'j@example.com' });
    expect(r.success).toBe(true);
  });

  it('rejects a malformed email', () => {
    const r = registerSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('defaults language to sw when omitted', () => {
    const { language: _, ...without } = valid;
    const r = registerSchema.safeParse(without);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.language).toBe('sw');
  });
});

describe('loginSchema', () => {
  it('accepts a valid payload', () => {
    expect(loginSchema.safeParse({ phone: '+254712345678', password: 'pw' }).success).toBe(true);
  });

  it('rejects missing phone', () => {
    expect(loginSchema.safeParse({ password: 'pw' }).success).toBe(false);
  });

  it('rejects missing password', () => {
    expect(loginSchema.safeParse({ phone: '+254712345678' }).success).toBe(false);
  });

  it('accepts optional deviceId', () => {
    const r = loginSchema.safeParse({ phone: '+254712345678', password: 'pw', deviceId: 'abc' });
    expect(r.success).toBe(true);
  });
});

describe('refreshSchema', () => {
  it('accepts a non-empty token', () => {
    expect(refreshSchema.safeParse({ refreshToken: 'abc123' }).success).toBe(true);
  });

  it('rejects an empty token', () => {
    expect(refreshSchema.safeParse({ refreshToken: '' }).success).toBe(false);
  });
});

describe('otpSendSchema', () => {
  it('accepts a valid +2547 phone', () => {
    expect(otpSendSchema.safeParse({ phone: '+254712345678' }).success).toBe(true);
  });

  it('accepts a valid +2541 phone', () => {
    expect(otpSendSchema.safeParse({ phone: '+254112345678' }).success).toBe(true);
  });

  it('rejects a phone without country code', () => {
    expect(otpSendSchema.safeParse({ phone: '0712345678' }).success).toBe(false);
  });

  it('rejects a phone with wrong prefix', () => {
    expect(otpSendSchema.safeParse({ phone: '+254612345678' }).success).toBe(false);
  });
});

describe('otpVerifySchema', () => {
  it('accepts a valid phone and 6-digit code', () => {
    expect(otpVerifySchema.safeParse({ phone: '+254712345678', code: '123456' }).success).toBe(true);
  });

  it('rejects a code shorter than 6 digits', () => {
    expect(otpVerifySchema.safeParse({ phone: '+254712345678', code: '12345' }).success).toBe(false);
  });

  it('rejects a code with non-digit characters', () => {
    expect(otpVerifySchema.safeParse({ phone: '+254712345678', code: '12345a' }).success).toBe(false);
  });
});

describe('updateMeSchema', () => {
  it('accepts a single valid field', () => {
    expect(updateMeSchema.safeParse({ fullName: 'New Name' }).success).toBe(true);
  });

  it('accepts all fields together', () => {
    const r = updateMeSchema.safeParse({
      fullName: 'New Name',
      email: 'new@example.com',
      county: 'Kisumu',
      language: 'en',
    });
    expect(r.success).toBe(true);
  });

  it('accepts null email to clear the field', () => {
    expect(updateMeSchema.safeParse({ email: null }).success).toBe(true);
  });

  it('rejects an empty object (nothing to update)', () => {
    expect(updateMeSchema.safeParse({}).success).toBe(false);
  });

  it('rejects fullName shorter than 2 chars', () => {
    expect(updateMeSchema.safeParse({ fullName: 'X' }).success).toBe(false);
  });

  it('rejects an unknown language', () => {
    expect(updateMeSchema.safeParse({ language: 'fr' }).success).toBe(false);
  });
});
