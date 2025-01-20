import sqlite3 from 'sqlite3';

export class Database {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
  }

  private async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (this: sqlite3.RunResult, err: Error | null) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  private async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async addWallet(wallet: { address: string; network: string; label?: string }): Promise<void> {
    await this.run(
      `INSERT INTO tracked_wallets (address, network, label)
       VALUES (?, ?, ?)`,
      [wallet.address, wallet.network, wallet.label]
    );
  }

  async getTrackedWallets(): Promise<any[]> {
    return this.all('SELECT * FROM tracked_wallets');
  }

  async removeWallet(address: string): Promise<void> {
    await this.run('DELETE FROM tracked_wallets WHERE address = ?', [address]);
  }

  async init(): Promise<void> {
    await this.run(`
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

    await this.run(`
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

    await this.run(`
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
    await this.run(
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
    await this.run(
      `INSERT INTO trades (coin_id, type, amount, price_usd, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [trade.coin_id, trade.type, trade.amount, trade.price_usd, trade.notes]
    );
  }

  async getHoldings(): Promise<any[]> {
    return this.all(`
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
    return this.all('SELECT * FROM coins');
  }

  async getTradeHistory(): Promise<any[]> {
    return this.all(`
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
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
