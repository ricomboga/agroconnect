import { ObjectId, type Db } from 'mongodb';
import type { DiagnosisDocument, DiagnosisResult, DiagnosisFeedback } from '../models/diagnosis.js';

const COLLECTION = 'diagnoses';

export class DiagnosisRepository {
  constructor(private db: Db) {}

  private col() {
    return this.db.collection<DiagnosisDocument>(COLLECTION);
  }

  async create(doc: Omit<DiagnosisDocument, '_id'>): Promise<DiagnosisDocument> {
    const result = await this.col().insertOne({ _id: new ObjectId(), ...doc } as DiagnosisDocument);
    return (await this.col().findOne({ _id: result.insertedId }))!;
  }

  async findById(id: string): Promise<DiagnosisDocument | null> {
    if (!ObjectId.isValid(id)) return null;
    return this.col().findOne({ _id: new ObjectId(id) });
  }

  async findByFarm(farmId: string, skip: number, limit: number): Promise<DiagnosisDocument[]> {
    return this.col()
      .find({ farmId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }

  async countByFarm(farmId: string): Promise<number> {
    return this.col().countDocuments({ farmId });
  }

  async setProcessing(id: string): Promise<void> {
    await this.col().updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'processing', updatedAt: new Date() } },
    );
  }

  async setCompleted(id: string, result: DiagnosisResult, processingTimeMs: number): Promise<void> {
    await this.col().updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'completed', result, processingTimeMs, updatedAt: new Date() } },
    );
  }

  async setFailed(id: string, error: string, errorCode?: string): Promise<void> {
    await this.col().updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'failed', error, errorCode, updatedAt: new Date() } },
    );
  }

  async addFeedback(id: string, feedback: DiagnosisFeedback): Promise<void> {
    await this.col().updateOne(
      { _id: new ObjectId(id) },
      { $set: { feedback, updatedAt: new Date() } },
    );
  }

  async ensureIndexes(): Promise<void> {
    await this.col().createIndex({ farmId: 1, createdAt: -1 });
    await this.col().createIndex({ farmerId: 1 });
    await this.col().createIndex({ status: 1 });
  }
}
