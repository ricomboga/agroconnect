import * as userRepo from '../../src/repositories/userRepository';
import * as sessionRepo from '../../src/repositories/sessionRepository';
import * as authService from '../../src/services/authService';

jest.mock('../../src/repositories/userRepository', () => ({
  findUserByPhone: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  updateUserLastLogin: jest.fn(),
  verifyUserPhone: jest.fn(),
  updateUserProfile: jest.fn(),
}));

jest.mock('../../src/repositories/sessionRepository', () => ({
  createSession: jest.fn(),
  findSessionByHash: jest.fn(),
  deleteSession: jest.fn(),
  deleteSessionsByUserId: jest.fn(),
}));

// Suppress Kafka connection errors in test environment
jest.mock('../../src/events/producers/userRegisteredProducer', () => ({
  publishUserRegistered: jest.fn(),
}));

const mockFindUserByPhone = jest.mocked(userRepo.findUserByPhone);
const mockFindUserById = jest.mocked(userRepo.findUserById);
const mockCreateUser = jest.mocked(userRepo.createUser);
const mockUpdateUserLastLogin = jest.mocked(userRepo.updateUserLastLogin);
const mockUpdateUserProfile = jest.mocked(userRepo.updateUserProfile);
const mockCreateSession = jest.mocked(sessionRepo.createSession);
const mockFindSessionByHash = jest.mocked(sessionRepo.findSessionByHash);
const mockDeleteSession = jest.mocked(sessionRepo.deleteSession);
const mockDeleteSessionsByUserId = jest.mocked(sessionRepo.deleteSessionsByUserId);

const fakeUser = {
  id: 'user-uuid-001',
  phone: '+254712345678',
  email: null,
  fullName: 'Jane Farmer',
  role: 'farmer' as const,
  county: null,
  language: 'sw' as const,
  passwordHash: '$2b$01$fakehash',
  isVerified: false,
  isActive: true,
  kycStatus: 'pending' as const,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  lastLoginAt: null,
  deviceId: null,
};

const fakeSession = {
  id: 'session-uuid-001',
  userId: 'user-uuid-001',
  deviceId: null,
  refreshTokenHash: 'fake-hash',
  ipAddress: '127.0.0.1',
  userAgent: 'test',
  expiresAt: new Date(Date.now() + 2592000 * 1000),
  createdAt: new Date(),
  user: fakeUser,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authService.register', () => {
  it('creates a user and returns tokens', async () => {
    mockFindUserByPhone.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(fakeUser as never);
    mockCreateSession.mockResolvedValue(fakeSession as never);

    const result = await authService.register(
      { phone: '+254712345678', password: 'password123', fullName: 'Jane Farmer', role: 'farmer', language: 'sw' },
      '127.0.0.1',
    );

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toHaveLength(96); // 48 bytes hex
    expect(result.user.phone).toBe('+254712345678');
    expect(mockCreateUser).toHaveBeenCalledTimes(1);
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
  });

  it('throws 409 PHONE_TAKEN when phone already exists', async () => {
    mockFindUserByPhone.mockResolvedValue(fakeUser as never);

    await expect(
      authService.register(
        { phone: '+254712345678', password: 'password123', fullName: 'Jane', role: 'farmer', language: 'sw' },
        '127.0.0.1',
      ),
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'PHONE_TAKEN' });
  });
});

describe('authService.login', () => {
  it('returns tokens when credentials are correct', async () => {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('correct_password', 1);
    mockFindUserByPhone.mockResolvedValue({ ...fakeUser, passwordHash: hash } as never);
    mockUpdateUserLastLogin.mockResolvedValue(undefined as never);
    mockCreateSession.mockResolvedValue(fakeSession as never);

    const result = await authService.login(
      { phone: '+254712345678', password: 'correct_password' },
      '127.0.0.1',
    );

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
  });

  it('throws 401 INVALID_CREDENTIALS for wrong password', async () => {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('correct_password', 1);
    mockFindUserByPhone.mockResolvedValue({ ...fakeUser, passwordHash: hash } as never);

    await expect(
      authService.login({ phone: '+254712345678', password: 'wrong_password' }, '127.0.0.1'),
    ).rejects.toMatchObject({ statusCode: 401, errorCode: 'INVALID_CREDENTIALS' });
  });

  it('throws 401 INVALID_CREDENTIALS when user not found', async () => {
    mockFindUserByPhone.mockResolvedValue(null);

    await expect(
      authService.login({ phone: '+254799999999', password: 'any' }, '127.0.0.1'),
    ).rejects.toMatchObject({ statusCode: 401, errorCode: 'INVALID_CREDENTIALS' });
  });

  it('throws 401 INVALID_CREDENTIALS when user is inactive', async () => {
    mockFindUserByPhone.mockResolvedValue({ ...fakeUser, isActive: false } as never);

    await expect(
      authService.login({ phone: '+254712345678', password: 'any' }, '127.0.0.1'),
    ).rejects.toMatchObject({ statusCode: 401, errorCode: 'INVALID_CREDENTIALS' });
  });
});

describe('authService.refresh', () => {
  it('rotates tokens when refresh token is valid', async () => {
    mockFindSessionByHash.mockResolvedValue(fakeSession as never);
    mockDeleteSession.mockResolvedValue(undefined as never);
    mockCreateSession.mockResolvedValue(fakeSession as never);

    const result = await authService.refresh('valid-refresh-token', '127.0.0.1');

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(mockDeleteSession).toHaveBeenCalledWith('session-uuid-001');
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
  });

  it('throws 401 INVALID_REFRESH_TOKEN when session not found', async () => {
    mockFindSessionByHash.mockResolvedValue(null);

    await expect(authService.refresh('bad-token', '127.0.0.1')).rejects.toMatchObject({
      statusCode: 401,
      errorCode: 'INVALID_REFRESH_TOKEN',
    });
  });
});

describe('authService.logout', () => {
  it('deletes the session when token is valid', async () => {
    mockFindSessionByHash.mockResolvedValue(fakeSession as never);
    mockDeleteSession.mockResolvedValue(undefined as never);

    await authService.logout('valid-token');
    expect(mockDeleteSession).toHaveBeenCalledWith('session-uuid-001');
  });

  it('is a no-op when token has no matching session', async () => {
    mockFindSessionByHash.mockResolvedValue(null);

    await expect(authService.logout('unknown-token')).resolves.toBeUndefined();
    expect(mockDeleteSession).not.toHaveBeenCalled();
  });
});

describe('authService.getMe', () => {
  it('returns the user profile', async () => {
    mockFindUserById.mockResolvedValue(fakeUser as never);

    const result = await authService.getMe('user-uuid-001');
    expect(result.id).toBe('user-uuid-001');
    expect(result.phone).toBe('+254712345678');
    expect(result.role).toBe('farmer');
  });

  it('throws 404 USER_NOT_FOUND when user does not exist', async () => {
    mockFindUserById.mockResolvedValue(null);

    await expect(authService.getMe('nonexistent')).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'USER_NOT_FOUND',
    });
  });
});

describe('authService.updateMe', () => {
  it('returns updated profile', async () => {
    const updated = { ...fakeUser, fullName: 'Jane Updated', county: 'Nakuru' };
    mockUpdateUserProfile.mockResolvedValue(updated as never);

    const result = await authService.updateMe('user-uuid-001', { fullName: 'Jane Updated', county: 'Nakuru' });
    expect(result.fullName).toBe('Jane Updated');
    expect(result.county).toBe('Nakuru');
  });

  it('throws 404 USER_NOT_FOUND when updateUserProfile returns null', async () => {
    mockUpdateUserProfile.mockResolvedValue(null as never);

    await expect(authService.updateMe('nonexistent', { fullName: 'X Y' })).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'USER_NOT_FOUND',
    });
  });
});

describe('authService.logoutAll', () => {
  it('deletes all sessions for a user', async () => {
    mockDeleteSessionsByUserId.mockResolvedValue(undefined as never);

    await expect(authService.logoutAll('user-uuid-001')).resolves.toBeUndefined();
    expect(mockDeleteSessionsByUserId).toHaveBeenCalledWith('user-uuid-001');
  });
});

describe('authService.verifyAccessToken', () => {
  it('verifies a token signed with the test private key', async () => {
    // register creates a real access token — extract and verify it
    mockFindUserByPhone.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(fakeUser as never);
    mockCreateSession.mockResolvedValue(fakeSession as never);

    const { accessToken } = await authService.register(
      { phone: '+254712345678', password: 'password123', fullName: 'Jane', role: 'farmer', language: 'sw' },
      '127.0.0.1',
    );

    const payload = authService.verifyAccessToken(accessToken);
    expect(payload.sub).toBe('user-uuid-001');
    expect(payload.role).toBe('farmer');
  });
});
