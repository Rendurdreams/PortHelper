import axios from 'axios';
import { Database } from '../db/database';

interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  symbol?: string;
  name?: string;
}

export class WalletService {
  private readonly baseUrl = 'https://solana-gateway.moralis.io/account';
  private database: Database;

  constructor(dbPath: string, private apiKey: string) {
    this.database = new Database(dbPath);
  }

  async addWallet(address: string, network: string, label?: string): Promise<void> {
    // Verify wallet exists by checking balance
    try {
      await this.getNativeBalance(network, address);
      await this.database.addWallet({ address, network, label });
    } catch (error) {
      throw new Error('Failed to verify wallet or add to database');
    }
  }

  async getTrackedWallets(): Promise<any[]> {
    return this.database.getTrackedWallets();
  }

  async removeWallet(address: string): Promise<void> {
    await this.database.removeWallet(address);
  }

  async getNativeBalance(network: string, address: string): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${network}/${address}/balance`,
        { 
          headers: { 
            'X-API-Key': this.apiKey,
            'Accept': 'application/json'
          }
        }
      );
      return response.data.balance;
    } catch (error) {
      throw new Error('Failed to fetch wallet balance');
    }
  }

  async getTokenBalances(network: string, address: string): Promise<TokenBalance[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${network}/${address}/tokens`,
        { 
          headers: { 
            'X-API-Key': this.apiKey,
            'Accept': 'application/json'
          }
        }
      );
      return response.data.tokens || [];
    } catch (error) {
      throw new Error('Failed to fetch token balances');
    }
  }

  async getPortfolio(network: string, address: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${network}/${address}/portfolio`,
        { 
          headers: { 
            'X-API-Key': this.apiKey,
            'Accept': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch wallet portfolio');
    }
  }
}