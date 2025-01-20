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

  async init(): Promise<void> {
    // Create coins table
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

    // Create trades table
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

    // Create strategies table
    await this.run(`
      CREATE TABLE IF NOT EXISTS strategies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parameters TEXT,
        last_run TIMESTAMP
      )
    `);

    // Create tracked_wallets table
    await this.run(`
      CREATE TABLE IF NOT EXISTS tracked_wallets (
        address TEXT PRIMARY KEY,
        network TEXT NOT NULL,
        label TEXT,
        tracked_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create journal_entries table
    await this.run(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        entry_type TEXT NOT NULL,
        coin_id TEXT,
        trade_type TEXT CHECK(type IN ('BUY', 'SELL')),
        amount REAL,
        price REAL,
        emotional_state TEXT NOT NULL,
        confidence_level INTEGER NOT NULL,
        market_sentiment TEXT NOT NULL,
        entry_text TEXT NOT NULL,
        lessons_learned TEXT,
        follow_up_needed BOOLEAN DEFAULT FALSE,
        tags TEXT,
        FOREIGN KEY (coin_id) REFERENCES coins(coin_id)
      )
    `);

    // Create portfolio_snapshots table
    await this.run(`
      CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_value_usd REAL NOT NULL,
        snapshot_data TEXT NOT NULL
      )
    `);

    // Create indices for better query performance
    await this.run('CREATE INDEX IF NOT EXISTS idx_trades_coin_id ON trades(coin_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(date)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON portfolio_snapshots(timestamp)');
  }

  // Wallet management methods
  async addWallet(wallet: { address: string; network: string; label?: string }): Promise<void> {
    await this.run(
      `INSERT INTO tracked_wallets (address, network, label)
       VALUES (?, ?, ?)`,
      [wallet.address, wallet.network, wallet.label]
    );
  }

  async getTrackedWallets(): Promise<any[]> {
    return this.all('SELECT * FROM tracked_wallets ORDER BY tracked_since DESC');
  }

  async removeWallet(address: string): Promise<void> {
    await this.run('DELETE FROM tracked_wallets WHERE address = ?', [address]);
  }

  // Portfolio management methods
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

  async updateCoinPrice(coinId: string, priceUsd: number): Promise<void> {
    await this.run(
      `UPDATE coins 
       SET price_usd = ?, last_updated = CURRENT_TIMESTAMP 
       WHERE coin_id = ?`,
      [priceUsd, coinId]
    );
  }

  async getTrackedCoins(): Promise<any[]> {
    return this.all('SELECT * FROM coins ORDER BY symbol');
  }

  // Trade management methods
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

  // Portfolio analysis methods
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
      ORDER BY value_usd DESC
    `);
  }

  async savePortfolioSnapshot(totalValue: number, snapshotData: string): Promise<void> {
    await this.run(
      `INSERT INTO portfolio_snapshots (total_value_usd, snapshot_data)
       VALUES (?, ?)`,
      [totalValue, snapshotData]
    );
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