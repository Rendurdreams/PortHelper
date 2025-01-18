import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export class Database {
  private db: sqlite3.Database;
  private runQuery: (sql: string, params?: any[]) => Promise<any>;
  private getQuery: (sql: string, params?: any[]) => Promise<any>;
  private allQuery: (sql: string, params?: any[]) => Promise<any[]>;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    // Promisify database methods
    this.runQuery = promisify(this.db.run.bind(this.db));
    this.getQuery = promisify(this.db.get.bind(this.db));
    this.allQuery = promisify(this.db.all.bind(this.db));
  }

  async init(): Promise<void> {
    // Create tables
    await this.runQuery(`
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
      )
    `);

    await this.runQuery(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coin_id TEXT NOT NULL,
        type TEXT CHECK(type IN ('BUY', 'SELL')) NOT NULL,
        amount REAL NOT NULL,
        price_usd REAL NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (coin_id) REFERENCES coins(coin_id)
      )
    `);

    await this.runQuery(`
      CREATE TABLE IF NOT EXISTS strategies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parameters TEXT,
        last_run TIMESTAMP
      )
    `);
  }

  async addCoin(coin: {
    coin_id: string;
    symbol: string;
    name: string;
    price_usd: number;
  }): Promise<void> {
    await this.runQuery(
      `INSERT OR REPLACE INTO coins (coin_id, symbol, name, price_usd, last_updated)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [coin.coin_id, coin.symbol, coin.name, coin.price_usd]
    );
  }

  async addTrade(trade: {
    coin_id: string;
    type: 'BUY' | 'SELL';
    amount: number;
    price_usd: number;
    notes?: string;
  }): Promise<void> {
    await this.runQuery(
      `INSERT INTO trades (coin_id, type, amount, price_usd, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [trade.coin_id, trade.type, trade.amount, trade.price_usd, trade.notes]
    );
  }

  async getHoldings(): Promise<any[]> {
    return this.allQuery(`
      WITH holdings AS (
        SELECT 
          coin_id,
          SUM(CASE WHEN type = 'BUY' THEN amount ELSE -amount END) as amount
        FROM trades
        GROUP BY coin_id
      )
      SELECT 
        c.symbol,
        c.name,
        h.amount as holdings,
        c.price_usd as current_price,
        (h.amount * c.price_usd) as value_usd
      FROM holdings h
      JOIN coins c ON h.coin_id = c.coin_id
      WHERE h.amount > 0
    `);
  }

  async getTrackedCoins(): Promise<any[]> {
    return this.allQuery('SELECT * FROM coins');
  }

  async getTradeHistory(): Promise<any[]> {
    return this.allQuery(`
      SELECT 
        t.*,
        c.symbol,
        c.name,
        (t.amount * t.price_usd) as total_value
      FROM trades t
      JOIN coins c ON t.coin_id = c.coin_id
      ORDER BY t.timestamp DESC
    `);
  }

  async close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}