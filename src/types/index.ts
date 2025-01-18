export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  price_usd: number;
  market_cap?: number;
  volume_24h?: number;
  price_change_24h?: number;
  last_updated: Date;
}

export interface Trade {
  id?: number;
  coin_id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price_usd: number;
  timestamp: Date;
  notes?: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  evaluate: (data: CoinData) => StrategySignal;
}

export interface StrategySignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
}
