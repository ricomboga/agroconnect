#!/usr/bin/env node
// Usage: node scripts/test-publish.js <topic> '<json-payload>'
// Example:
//   node scripts/test-publish.js diagnosis.completed '{"diagnosisId":"test-123","farmerId":"farmer-abc","diseaseName":"Grey Leaf Spot","occurredAt":"2026-06-13T10:00:00Z"}'

import { createProducer } from '@agroconnect/kafka';

const [, , topic, payload] = process.argv;

if (!topic || !payload) {
  console.error('Usage: node scripts/test-publish.js <topic> <json-payload>');
  process.exit(1);
}

const BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

const producer = await createProducer(BROKERS);
try {
  await producer.send({
    topic,
    messages: [{ value: payload }],
  });
  console.log(`Published to ${topic}:`, payload);
} finally {
  await producer.disconnect();
}
