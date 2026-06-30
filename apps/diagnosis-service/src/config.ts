export const config = {
  port: parseInt(process.env['PORT'] ?? '8000', 10),
  mongodbUri: process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/diagnosis_db',
  kafkaBrokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
  kafkaConsumerGroup: process.env['KAFKA_CONSUMER_GROUP'] ?? 'diagnosis-service',

  // AI provider: 'claude' (default) | 'google-vision' | 'mock'
  inferenceProvider: (process.env['INFERENCE_PROVIDER'] ?? 'claude') as 'claude' | 'google-vision' | 'mock',

  // Claude
  anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? '',
  claudeModel: process.env['CLAUDE_MODEL'] ?? 'claude-sonnet-4-6',

  // Google Vision (optional — only needed when INFERENCE_PROVIDER=google-vision)
  googleCredentials: process.env['GOOGLE_APPLICATION_CREDENTIALS'] ?? '',

  minConfidence: parseFloat(process.env['MIN_CONFIDENCE'] ?? '0.60'),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
};
