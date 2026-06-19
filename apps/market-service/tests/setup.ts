process.env['NODE_ENV'] = 'test';
process.env['MARKET_DATABASE_URL'] = 'postgresql://postgres:password@localhost:5432/market_test';
process.env['JWT_PUBLIC_KEY'] = 'test-public-key';
process.env['KAFKA_BROKERS'] = 'localhost:9092';
