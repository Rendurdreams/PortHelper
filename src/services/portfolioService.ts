// src/services/portfolioService.ts
import { Database } from 'sqlite3';
import { promisify } from 'util';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  private supabase: SupabaseClient;

  constructor(dbPath: string) {
    // Initialize SQLite
    this.db = new Database(dbPath);
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));

    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
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
    // First, add to Supabase tracking
    try {
      await this.supabase
        .from('tracked_coins')
        .upsert({
          cmc_id: coin.cmc_id,
          symbol: coin.symbol,
          name: coin.name
        }, {
          onConflict: 'cmc_id'
        });
    } catch (error) {
      console.error('Error adding coin to Supabase tracking:', error);
      // Continue with local DB operations even if Supabase fails
    }

    // Then add to local SQLite database
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
    // Update local database
    await this.run(`
      UPDATE portfolio_coins 
      SET last_price = ?, last_updated = CURRENT_TIMESTAMP
      WHERE cmc_id = ?
    `, [price, cmcId]);
  }

  async getLatestPriceFromSupabase(cmcId: number): Promise<number | null> {
    try {
      const { data } = await this.supabase
        .from('coins')
        .select('price_usd')
        .eq('cmc_id', cmcId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      return data?.price_usd || null;
    } catch (error) {
      console.error(`Error fetching price from Supabase for coin ${cmcId}:`, error);
      return null;
    }
  }

  async getCoins(): Promise<PortfolioCoin[]> {
    const coins = await this.all('SELECT * FROM portfolio_coins');
    
    // Update prices from Supabase if available
    for (const coin of coins) {
      const latestPrice = await this.getLatestPriceFromSupabase(coin.cmc_id);
      if (latestPrice !== null) {
        coin.last_price = latestPrice;
        // Update local database with new price
        await this.updatePrice(coin.cmc_id, latestPrice);
      }
    }
    
    return coins;
  }

  async getCoin(cmcId: number): Promise<PortfolioCoin | null> {
    const coin = await this.get('SELECT * FROM portfolio_coins WHERE cmc_id = ?', [cmcId]);
    
    if (coin) {
      // Update price from Supabase if available
      const latestPrice = await this.getLatestPriceFromSupabase(cmcId);
      if (latestPrice !== null) {
        coin.last_price = latestPrice;
        // Update local database with new price
        await this.updatePrice(cmcId, latestPrice);
      }
    }
    
    return coin;
  }

  async removeCoin(cmcId: number): Promise<void> {
    // Remove from local database
    await this.run('DELETE FROM portfolio_coins WHERE cmc_id = ?', [cmcId]);
    
    // Optionally remove from Supabase tracking if no other portfolios are using it
    // You might want to keep it in Supabase for historical data
    /* 
    try {
      await this.supabase
        .from('tracked_coins')
        .delete()
        .eq('cmc_id', cmcId);
    } catch (error) {
      console.error('Error removing coin from Supabase tracking:', error);
    }
    */
  }

  async getPortfolioValue(): Promise<{ 
    total: number; 
    coins: Array<{ 
      coin: PortfolioCoin; 
      value: number; 
      profitLoss: number 
    }> 
  }> {
    const coins = await this.getCoins(); // This will update prices from Supabase
    let total = 0;
    const coinValues = [];

    for (const coin of coins) {
      const value = coin.amount * coin.last_price;
      const profitLoss = value - (coin.amount * coin.entry_price);
      total += value;
      
      coinValues.push({
        coin,
        value,
        profitLoss
      });
    }

    return {
      total,
      coins: coinValues
    };
  }
}