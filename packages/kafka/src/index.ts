import { Kafka, Producer, Consumer, KafkaConfig, ConsumerConfig } from 'kafkajs';

export function createKafkaClient(config: KafkaConfig): Kafka {
  return new Kafka(config);
}

export async function createProducer(brokers: string[]): Promise<Producer> {
  const kafka = new Kafka({ clientId: 'agroconnect', brokers });
  const producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function createConsumer(
  brokers: string[],
  groupId: string,
  options?: Omit<ConsumerConfig, 'groupId'>,
): Promise<Consumer> {
  const kafka = new Kafka({ clientId: 'agroconnect', brokers });
  const consumer = kafka.consumer({ groupId, ...options });
  await consumer.connect();
  return consumer;
}

export type { Producer, Consumer };
