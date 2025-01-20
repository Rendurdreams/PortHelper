import axios from 'axios';
import { Database } from '../db/database';

interface TokenBalance {
  token_address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
}

export class WalletService {
  private readonly ethBaseUrl = 'https://deep-index.moralis.io/api/v2.2';
  private readonly solBaseUrl = 'https://solana-gateway.moralis.io/account';
  private database: Database;

  constructor(dbPath: string, private apiKey: string) {
    this.database = new Database(dbPath);
  }

  async addWallet(address: string, network: string, label?: string): Promise<void> {
    try {
      // Verify wallet exists by checking balance
      await this.getNativeBalance(network, address);
      await this.database.addWallet({ address, network, label });
    } catch (error) {
      console.error('Verification error:', error);
      throw new Error('Failed to verify wallet or add to database');
    }
  }

  async getTrackedWallets(): Promise<any[]> {
    return this.database.getTrackedWallets();
  }

  async removeWallet(address: string): Promise<void> {
    await this.database.removeWallet(address);
  }

  async getNativeBalance(network: string, address: string): Promise<string> {
    try {
      let response;
      
      if (network === 'eth_mainnet') {
        response = await axios.get(
          `${this.ethBaseUrl}/${address}/balance`,
          {
            headers: {
              'X-API-Key': this.apiKey,
              'Accept': 'application/json'
            },
            params: {
              chain: 'eth'
            }
          }
        );
        
        const balanceInWei = BigInt(response.data.balance);
        return (Number(balanceInWei) / 1e18).toFixed(6);
      } else if (network === 'sol_mainnet') {
        response = await axios.get(
          `${this.solBaseUrl}/mainnet/${address}/balance`,
          {
            headers: {
              'X-API-Key': this.apiKey,
              'Accept': 'application/json'
            }
          }
        );
        
        return (response.data.lamports / 1e9).toFixed(6);
      }
      throw new Error('Unsupported network');
    } catch (error) {
      console.error('Error fetching native balance:', error);
      throw new Error('Failed to fetch wallet balance');
    }
  }

  async getTokenBalances(network: string, address: string): Promise<TokenBalance[]> {
    try {
      if (network === 'eth_mainnet') {
        // For ETH, we use the erc20 endpoint
        const response = await axios.get(
          `${this.ethBaseUrl}/${address}/erc20`,
          {
            headers: {
              'X-API-Key': this.apiKey,
              'Accept': 'application/json'
            },
            params: {
              chain: 'eth'
            }
          }
        );

        return response.data.map((token: any) => ({
          token_address: token.token_address,
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          decimals: token.decimals
        }));
      } else if (network === 'sol_mainnet') {
        // For Solana, we use the tokens endpoint
        const response = await axios.get(
          `${this.solBaseUrl}/mainnet/${address}/tokens`,
          {
            headers: {
              'X-API-Key': this.apiKey,
              'Accept': 'application/json'
            }
          }
        );

        const tokens = response.data.tokens || [];
        return tokens.map((token: any) => ({
          token_address: token.mint,
          symbol: token.symbol || 'Unknown',
          name: token.name || token.symbol || 'Unknown Token',
          balance: token.amount.toString(),
          decimals: token.decimals || 0
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching token balances:', error);
      throw new Error('Failed to fetch token balances');
    }
  }

  async getPortfolio(network: string, address: string): Promise<any> {
    try {
      let portfolio: any = {
        nativeBalance: "0",
        tokens: []
      };

      // Get native balance first
      portfolio.nativeBalance = await this.getNativeBalance(network, address);

      if (network === 'eth_mainnet') {
        // For ETH, fetch token balances with erc20 endpoint
        const tokens = await this.getTokenBalances(network, address);
        portfolio.tokens = tokens.map(token => ({
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          decimals: token.decimals,
          address: token.token_address
        }));
      } else if (network === 'sol_mainnet') {
        // For Solana, use the portfolio endpoint
        const response = await axios.get(
          `${this.solBaseUrl}/mainnet/${address}/portfolio`,
          {
            headers: {
              'X-API-Key': this.apiKey,
              'Accept': 'application/json'
            }
          }
        );

        portfolio.tokens = (response.data.tokens || []).map((token: any) => ({
          symbol: token.symbol || 'Unknown',
          name: token.name || token.symbol || 'Unknown Token',
          balance: token.amount.toString(),
          decimals: token.decimals || 0,
          address: token.mint
        }));
      }

      return portfolio;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      throw new Error('Failed to fetch portfolio data');
    }
  }

  private formatPortfolioData(portfolio: any): any {
    const formatted: any = {
      nativeBalance: portfolio.nativeBalance,
      tokens: []
    };

    if (portfolio.tokens && Array.isArray(portfolio.tokens)) {
      formatted.tokens = portfolio.tokens.map((token: any) => ({
        symbol: token.symbol || 'Unknown',
        balance: token.balance,
        decimals: token.decimals,
        address: token.address || token.token_address
      }));
    }

    return formatted;
  }
}