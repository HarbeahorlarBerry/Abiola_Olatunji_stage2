CREATE TABLE IF NOT EXISTS countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  capital VARCHAR(100),
  region VARCHAR(100),
  population BIGINT,
  currency_code VARCHAR(10),
  exchange_rate DECIMAL(15,6),
  estimated_gdp DECIMAL(20,2),
  flag_url TEXT,
  last_refreshed_at DATETIME
);

