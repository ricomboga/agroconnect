import supertest from 'supertest';
import { app } from '../../src/index';

// --- Mocks ---------------------------------------------------------------

jest.mock('../../src/services/storageService', () => ({
  uploadToS3: jest.fn().mockResolvedValue({
    url: 'https://bucket.s3.af-south-1.amazonaws.com/farm-photos/farm-1/test-uuid.jpg',
    cdn_url: 'https://media.agroconnect.africa/farm-photos/farm-1/test-uuid.jpg',
    key: 'farm-photos/farm-1/test-uuid.jpg',
    size_bytes: 1024,
    mime_type: 'image/jpeg',
  }),
  deleteFromS3: jest.fn().mockResolvedValue(undefined),
  getPresignedUrl: jest.fn().mockResolvedValue('https://bucket.s3.amazonaws.com/signed-url'),
}));

jest.mock('../../src/utils/imageResize', () => ({
  resizeIfNeeded: jest.fn().mockImplementation((buf: Buffer) => Promise.resolve(buf)),
}));

// Shared package auth middleware — stub out JWT validation
jest.mock('@agroconnect/shared', () => ({
  authenticate: (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      _res.status(401).json({ error_code: 'UNAUTHORIZED', message_key: 'error.auth.missing_token', request_id: '', timestamp: new Date().toISOString() });
      return;
    }
    const token = auth.slice(7);
    if (token === 'valid-farmer-token') {
      (req as unknown as { user: { id: string; role: string; phone: string; isVerified: boolean } }).user = { id: 'user-1', role: 'farmer', phone: '+254700000001', isVerified: true };
      next();
    } else if (token === 'valid-admin-token') {
      (req as unknown as { user: { id: string; role: string; phone: string; isVerified: boolean } }).user = { id: 'admin-1', role: 'admin', phone: '+254700000002', isVerified: true };
      next();
    } else {
      _res.status(401).json({ error_code: 'UNAUTHORIZED', message_key: 'error.token.invalid', request_id: '', timestamp: new Date().toISOString() });
    }
  },
  authorize: (...roles: string[]) => (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const user = (req as unknown as { user: { role: string } }).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error_code: 'FORBIDDEN', message_key: 'error.auth.forbidden', request_id: '', timestamp: new Date().toISOString() });
      return;
    }
    next();
  },
}));

// --- Helpers -------------------------------------------------------------

// Valid JPEG magic bytes + padding to 1 KB
const jpegBuffer = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(1020)]);
// Valid PNG magic bytes + padding
const pngBuffer = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(1016)]);
// Valid PDF magic bytes + padding
const pdfBuffer = Buffer.concat([Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]), Buffer.alloc(1019)]);
// Unsupported type
const unknownBuffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

const FARMER_TOKEN = 'Bearer valid-farmer-token';
const ADMIN_TOKEN = 'Bearer valid-admin-token';

const api = supertest(app);

// --- POST /api/v1/media/upload -------------------------------------------

describe('POST /api/v1/media/upload', () => {
  it('returns 201 with upload result for a valid JPEG', async () => {
    const res = await api
      .post('/api/v1/media/upload')
      .set('Authorization', FARMER_TOKEN)
      .attach('file', jpegBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .field('category', 'farm-photos')
      .field('entity_id', 'farm-1');

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      mime_type: 'image/jpeg',
      key: expect.stringContaining('farm-photos/farm-1/'),
    });
  });

  it('returns 201 for a valid PNG', async () => {
    const res = await api
      .post('/api/v1/media/upload')
      .set('Authorization', FARMER_TOKEN)
      .attach('file', pngBuffer, { filename: 'photo.png', contentType: 'image/png' })
      .field('category', 'diagnosis-images')
      .field('entity_id', 'diag-99');

    expect(res.status).toBe(201);
    expect(res.body.data.mime_type).toBe('image/jpeg'); // storageService mock returns jpeg
  });

  it('returns 201 for a valid PDF document', async () => {
    const res = await api
      .post('/api/v1/media/upload')
      .set('Authorization', FARMER_TOKEN)
      .attach('file', pdfBuffer, { filename: 'doc.pdf', contentType: 'application/pdf' })
      .field('category', 'govt-documents')
      .field('entity_id', 'doc-7');

    expect(res.status).toBe(201);
  });

  it('returns 400 when no file is attached', async () => {
    const res = await api
      .post('/api/v1/media/upload')
      .set('Authorization', FARMER_TOKEN)
      .field('category', 'farm-photos')
      .field('entity_id', 'farm-1');

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('FILE_MISSING');
  });

  it('returns 400 for unsupported file type detected via magic bytes', async () => {
    const res = await api
      .post('/api/v1/media/upload')
      .set('Authorization', FARMER_TOKEN)
      .attach('file', unknownBuffer, { filename: 'evil.exe', contentType: 'image/jpeg' })
      .field('category', 'farm-photos')
      .field('entity_id', 'farm-1');

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('returns 400 when category is invalid', async () => {
    const res = await api
      .post('/api/v1/media/upload')
      .set('Authorization', FARMER_TOKEN)
      .attach('file', jpegBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .field('category', 'invalid-category')
      .field('entity_id', 'farm-1');

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when entity_id is missing', async () => {
    const res = await api
      .post('/api/v1/media/upload')
      .set('Authorization', FARMER_TOKEN)
      .attach('file', jpegBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .field('category', 'farm-photos');

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when entity_id contains path traversal characters', async () => {
    const res = await api
      .post('/api/v1/media/upload')
      .set('Authorization', FARMER_TOKEN)
      .attach('file', jpegBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .field('category', 'farm-photos')
      .field('entity_id', '../../etc/passwd');

    expect(res.status).toBe(400);
  });

  it('returns 400 when image exceeds 5 MB', async () => {
    const bigImage = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(5 * 1024 * 1024 + 1)]);
    const res = await api
      .post('/api/v1/media/upload')
      .set('Authorization', FARMER_TOKEN)
      .attach('file', bigImage, { filename: 'big.jpg', contentType: 'image/jpeg' })
      .field('category', 'farm-photos')
      .field('entity_id', 'farm-1');

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('FILE_TOO_LARGE');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await api
      .post('/api/v1/media/upload')
      .attach('file', jpegBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' })
      .field('category', 'farm-photos')
      .field('entity_id', 'farm-1');

    expect(res.status).toBe(401);
  });
});

// --- DELETE /api/v1/media/* ----------------------------------------------

describe('DELETE /api/v1/media/:key', () => {
  it('returns 204 when admin deletes an existing key', async () => {
    const res = await api
      .delete('/api/v1/media/farm-photos/farm-1/uuid.jpg')
      .set('Authorization', ADMIN_TOKEN);

    expect(res.status).toBe(204);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await api.delete('/api/v1/media/farm-photos/farm-1/uuid.jpg');
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is not an admin', async () => {
    const res = await api
      .delete('/api/v1/media/farm-photos/farm-1/uuid.jpg')
      .set('Authorization', FARMER_TOKEN);

    expect(res.status).toBe(403);
  });
});

// --- GET /api/v1/media/sign/* --------------------------------------------

describe('GET /api/v1/media/sign/:key', () => {
  it('returns 200 with a signed URL using default expires', async () => {
    const res = await api
      .get('/api/v1/media/sign/govt-documents/entity-1/uuid.pdf')
      .set('Authorization', FARMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      signed_url: expect.any(String),
      expires_in: 3600,
    });
  });

  it('returns 200 with a signed URL for custom expires', async () => {
    const res = await api
      .get('/api/v1/media/sign/govt-documents/entity-1/uuid.pdf?expires=7200')
      .set('Authorization', FARMER_TOKEN);

    expect(res.status).toBe(200);
    expect(res.body.data.expires_in).toBe(7200);
  });

  it('returns 400 when expires exceeds 86400', async () => {
    const res = await api
      .get('/api/v1/media/sign/govt-documents/entity-1/uuid.pdf?expires=99999')
      .set('Authorization', FARMER_TOKEN);

    expect(res.status).toBe(400);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await api.get('/api/v1/media/sign/govt-documents/entity-1/uuid.pdf');
    expect(res.status).toBe(401);
  });
});
