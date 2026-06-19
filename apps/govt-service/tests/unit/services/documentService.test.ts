import * as documentRepo from '../../../src/repositories/documentRepository';
import * as mediaClient from '../../../src/clients/mediaClient';
import * as documentService from '../../../src/services/documentService';

jest.mock('../../../src/repositories/documentRepository', () => ({
  createDocument: jest.fn(),
  findDocumentsByUser: jest.fn(),
  countDocumentsByUser: jest.fn(),
}));

jest.mock('../../../src/clients/mediaClient', () => ({
  uploadDocument: jest.fn(),
}));

const mockCreateDocument = jest.mocked(documentRepo.createDocument);
const mockFindDocumentsByUser = jest.mocked(documentRepo.findDocumentsByUser);
const mockCountDocumentsByUser = jest.mocked(documentRepo.countDocumentsByUser);
const mockUploadDocument = jest.mocked(mediaClient.uploadDocument);

const fakeDocument = {
  id: 'doc-1',
  userId: 'user-1',
  documentType: 'national_id',
  fileName: 'id.pdf',
  mediaUrl: 'https://media.example.com/docs/id.pdf',
  createdAt: new Date(),
};

const fakeFile = {
  buffer: Buffer.from('fake-pdf-content'),
  originalname: 'id.pdf',
  mimetype: 'application/pdf',
} as Express.Multer.File;

beforeEach(() => jest.clearAllMocks());

describe('documentService.uploadDocument', () => {
  it('uploads to media and saves document record', async () => {
    mockUploadDocument.mockResolvedValue({ url: 'https://media.example.com/docs/id.pdf', key: 'govt-documents/user-1/id.pdf' });
    mockCreateDocument.mockResolvedValue(fakeDocument as never);

    const dto = { documentType: 'national_id' as const };
    const result = await documentService.uploadDocument('user-1', fakeFile, dto);

    expect(mockUploadDocument).toHaveBeenCalledWith(
      fakeFile.buffer,
      'id.pdf',
      'application/pdf',
      'user-1',
    );
    expect(mockCreateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        documentType: 'national_id',
        fileName: 'id.pdf',
        mediaUrl: 'https://media.example.com/docs/id.pdf',
      }),
    );
    expect(result.id).toBe('doc-1');
  });

  it('propagates error when media upload fails', async () => {
    mockUploadDocument.mockRejectedValue(new Error('S3 unavailable'));

    await expect(
      documentService.uploadDocument('user-1', fakeFile, { documentType: 'national_id' as const }),
    ).rejects.toThrow('S3 unavailable');
  });
});

describe('documentService.listDocuments', () => {
  it('returns documents and total for a user', async () => {
    mockFindDocumentsByUser.mockResolvedValue([fakeDocument] as never);
    mockCountDocumentsByUser.mockResolvedValue(1);

    const result = await documentService.listDocuments('user-1', { take: 20, skip: 0 });

    expect(result.documents).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(mockFindDocumentsByUser).toHaveBeenCalledWith('user-1', { take: 20, skip: 0 });
  });

  it('runs findDocuments and count in parallel', async () => {
    mockFindDocumentsByUser.mockResolvedValue([]);
    mockCountDocumentsByUser.mockResolvedValue(0);

    await documentService.listDocuments('user-1', { take: 20, skip: 0 });

    expect(mockFindDocumentsByUser).toHaveBeenCalledTimes(1);
    expect(mockCountDocumentsByUser).toHaveBeenCalledTimes(1);
  });
});
