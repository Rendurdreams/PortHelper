import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface TrackedCoin {
  cmc_id: number;
  symbol: string;
  name: string;
  added_at?: string;
}

interface CoinPrice {
  timestamp: string;
  cmc_id: number;
  price_usd: number;
  volume_24h: number;
  market_cap: number;
}

export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment variables');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Add a new coin to tracking if it doesn't exist
   */
  async addCoinToTracking(coin: Omit<TrackedCoin, 'added_at'>): Promise<void> {
    try {
      // Check if coin already exists
      const { data: existing } = await this.supabase
        .from('tracked_coins')
        .select()
        .eq('cmc_id', coin.cmc_id)
        .single();

      if (!existing) {
        // Add to tracked_coins if not already there
        const { error } = await this.supabase
          .from('tracked_coins')
          .insert([coin]);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error adding coin to tracking:', error);
      throw error;
    }
  }

  /**
   * Get the latest price data for a specific coin
   */
  async getLatestPrice(cmcId: number): Promise<CoinPrice | null> {
    try {
      const { data, error } = await this.supabase
        .from('coins')
        .select('*')
        .eq('cmc_id', cmcId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching latest price for coin ${cmcId}:`, error);
      throw error;
    }
  }

  /**
   * Get all tracked coins
   */
  async getTrackedCoins(): Promise<TrackedCoin[]> {
    try {
      const { data, error } = await this.supabase
        .from('tracked_coins')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tracked coins:', error);
      throw error;
    }
  }

  /**
   * Get historical price data for a coin within a date range
   */
  async getHistoricalPrices(
    cmcId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<CoinPrice[]> {
    try {
      const { data, error } = await this.supabase
        .from('coins')
        .select('*')
        .eq('cmc_id', cmcId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching historical prices for coin ${cmcId}:`, error);
      throw error;
    }
  }
}