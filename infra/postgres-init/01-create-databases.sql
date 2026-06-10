-- farm_db is already created by POSTGRES_DB env var.
-- This script creates all other service databases on first boot.

CREATE DATABASE auth_db;
CREATE DATABASE soil_db;
CREATE DATABASE finance_db;
CREATE DATABASE market_db;
CREATE DATABASE community_db;
CREATE DATABASE govt_db;
CREATE DATABASE weather_db;
CREATE DATABASE predict_db;
CREATE DATABASE notification_db;

GRANT ALL PRIVILEGES ON DATABASE auth_db TO agroconnect;
GRANT ALL PRIVILEGES ON DATABASE soil_db TO agroconnect;
GRANT ALL PRIVILEGES ON DATABASE finance_db TO agroconnect;
GRANT ALL PRIVILEGES ON DATABASE market_db TO agroconnect;
GRANT ALL PRIVILEGES ON DATABASE community_db TO agroconnect;
GRANT ALL PRIVILEGES ON DATABASE govt_db TO agroconnect;
GRANT ALL PRIVILEGES ON DATABASE weather_db TO agroconnect;
GRANT ALL PRIVILEGES ON DATABASE predict_db TO agroconnect;
GRANT ALL PRIVILEGES ON DATABASE notification_db TO agroconnect;
