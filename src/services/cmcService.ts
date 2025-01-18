// src/services/cmcService.ts
import axios from 'axios';

interface CMCQuote {
  price: number;
  volume_24h: number;
  market_cap: number;
  percent_change_24h: number;
}

export interface CMCCoin {
  id: number;           // CMC ID
  name: string;
  symbol: string;
  slug: string;
  quote: {
    USD: CMCQuote;
  }
}

interface CMCResponse {
  data: {
    [key: string]: CMCCoin;
  };
  status: {
    error_code: number;
    error_message: string | null;
  };
}

export class CMCService {
  private apiKey: string;
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchCoin(query: string): Promise<CMCCoin[]> {
    try {
      const response = await axios.get<CMCResponse>(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey
        },
        params: {
          symbol: query.toUpperCase(),
          convert: 'USD'
        }
      });

      // Convert response data object to array
      return Object.values(response.data.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`CMC API Error: ${error.response?.data?.status?.error_message || error.message}`);
      }
      throw new Error('Failed to fetch coin data');
    }
  }

  async getCoinInfo(cmcId: number): Promise<CMCCoin> {
    try {
      const response = await axios.get<CMCResponse>(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey
        },
        params: {
          id: cmcId,
          convert: 'USD'
        }
      });

      const coins = Object.values(response.data.data);
      if (coins.length === 0) {
        throw new Error(`No coin found with CMC ID: ${cmcId}`);
      }
      return coins[0];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`CMC API Error: ${error.response?.data?.status?.error_message || error.message}`);
      }
      throw new Error('Failed to fetch coin data');
    }
  }

  async searchMultipleCoins(cmcIds: number[]): Promise<CMCCoin[]> {
    try {
      const response = await axios.get<CMCResponse>(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey
        },
        params: {
          id: cmcIds.join(','),
          convert: 'USD'
        }
      });

      return Object.values(response.data.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`CMC API Error: ${error.response?.data?.status?.error_message || error.message}`);
      }
      throw new Error('Failed to fetch coins data');
    }
  }
}