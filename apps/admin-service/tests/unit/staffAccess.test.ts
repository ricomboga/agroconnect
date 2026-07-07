import { assertCapability } from '../../src/middleware/staffAccess';

describe('assertCapability', () => {
  it('lets a super admin through regardless of capability or staffRole', () => {
    const superAdmin = { isSuperAdmin: true, staffRole: 'moderator' };
    expect(() => assertCapability(superAdmin, 'manage_users')).not.toThrow();
    expect(() => assertCapability(superAdmin, 'kyc')).not.toThrow();
    expect(() => assertCapability(superAdmin, 'moderate')).not.toThrow();
    expect(() => assertCapability(superAdmin, 'analytics')).not.toThrow();
  });

  it('lets a moderator through only for the moderate capability', () => {
    const moderator = { staffRole: 'moderator' };
    expect(() => assertCapability(moderator, 'moderate')).not.toThrow();
    expect(() => assertCapability(moderator, 'manage_users')).toThrow();
    expect(() => assertCapability(moderator, 'kyc')).toThrow();
    expect(() => assertCapability(moderator, 'analytics')).toThrow();
  });

  it('blocks only the moderate capability for a county admin', () => {
    const countyAdmin = { staffRole: 'county_admin' };
    expect(() => assertCapability(countyAdmin, 'moderate')).toThrow();
    expect(() => assertCapability(countyAdmin, 'manage_users')).not.toThrow();
    expect(() => assertCapability(countyAdmin, 'kyc')).not.toThrow();
    expect(() => assertCapability(countyAdmin, 'analytics')).not.toThrow();
  });

  it('allows every capability for the default/standard admin tier', () => {
    const standardAdmin = {};
    expect(() => assertCapability(standardAdmin, 'manage_users')).not.toThrow();
    expect(() => assertCapability(standardAdmin, 'kyc')).not.toThrow();
    expect(() => assertCapability(standardAdmin, 'moderate')).not.toThrow();
    expect(() => assertCapability(standardAdmin, 'analytics')).not.toThrow();
  });

  it('throws a 403 error shape', () => {
    try {
      assertCapability({ staffRole: 'moderator' }, 'manage_users');
      throw new Error('expected assertCapability to throw');
    } catch (err) {
      expect(err).toMatchObject({ statusCode: 403, errorCode: 'FORBIDDEN' });
    }
  });
});
