import Database from 'better-sqlite3';

export const initializeDatabase = (db: Database): void => {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS coins (
      coin_id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      is_in_top_100 BOOLEAN DEFAULT false,
      last_updated TIMESTAMP,
      price_usd REAL,
      market_cap REAL,
      volume_24h REAL,
      price_change_24h REAL
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coin_id TEXT NOT NULL,
      type TEXT CHECK(type IN ('BUY', 'SELL')) NOT NULL,
      amount REAL NOT NULL,
      price_usd REAL NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (coin_id) REFERENCES coins(coin_id)
    );

    CREATE TABLE IF NOT EXISTS strategies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      parameters TEXT,
      last_run TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS strategy_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strategy_id TEXT NOT NULL,
      coin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      confidence REAL,
      reasoning TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (strategy_id) REFERENCES strategies(id),
      FOREIGN KEY (coin_id) REFERENCES coins(coin_id)
    );
  `);
};
