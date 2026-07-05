process.env['NODE_ENV'] = 'test';
process.env['MARKET_DATABASE_URL'] = 'postgresql://agroconnect:agroconnect_dev@localhost:5434/market_test';
process.env['JWT_PUBLIC_KEY'] = 'test-public-key';
process.env['KAFKA_BROKERS'] = 'localhost:9092';
