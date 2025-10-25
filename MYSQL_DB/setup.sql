CREATE TABLE countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    capital VARCHAR(100),
    region VARCHAR(100),
    population BIGINT,
    currency_code VARCHAR(10),
    exchange_rate DECIMAL(10,4),
    estimated_gdp DECIMAL(15,2),
    flag_url TEXT,
    last_refreshed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
