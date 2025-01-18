// src/services/portfolioService.ts
import { Database } from 'sqlite3';
import { promisify } from 'util';

export interface PortfolioCoin {
  cmc_id: number;
  symbol: string;
  name: string;
  amount: number;
  entry_price: number;
  last_price: number;
  strategy?: string;
}

export class PortfolioService {
  private db: Database;
  private run: (sql: string, params?: any[]) => Promise<any>;
  private get: (sql: string, params?: any[]) => Promise<any>;
  private all: (sql: string, params?: any[]) => Promise<any[]>;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));
  }

  async init(): Promise<void> {
    await this.run(`
      CREATE TABLE IF NOT EXISTS portfolio_coins (
        cmc_id INTEGER PRIMARY KEY,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        entry_price REAL NOT NULL,
        last_price REAL NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        strategy TEXT
      )
    `);
  }

  async addCoin(coin: PortfolioCoin): Promise<void> {
    await this.run(`
      INSERT OR REPLACE INTO portfolio_coins (
        cmc_id, symbol, name, amount, entry_price, last_price, strategy
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      coin.cmc_id,
      coin.symbol,
      coin.name,
      coin.amount,
      coin.entry_price,
      coin.last_price,
      coin.strategy
    ]);
  }

  async updatePrice(cmcId: number, price: number): Promise<void> {
    await this.run(`
      UPDATE portfolio_coins 
      SET last_price = ?, last_updated = CURRENT_TIMESTAMP
      WHERE cmc_id = ?
    `, [price, cmcId]);
  }

  async getCoins(): Promise<PortfolioCoin[]> {
    return this.all('SELECT * FROM portfolio_coins');
  }

  async getCoin(cmcId: number): Promise<PortfolioCoin | null> {
    return this.get('SELECT * FROM portfolio_coins WHERE cmc_id = ?', [cmcId]);
  }

  async removeCoin(cmcId: number): Promise<void> {
    await this.run('DELETE FROM portfolio_coins WHERE cmc_id = ?', [cmcId]);
  }
}