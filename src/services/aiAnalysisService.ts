// src/services/aiAnalysisService.ts
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { PortfolioService } from './portfolioService';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

interface GlobalMetrics {
  total_market_cap: number;
  btc_dominance: number;
  market_sentiment: string;
  timestamp: string;
}

export class AIAnalysisService {
  private supabase: SupabaseClient;
  private portfolio: PortfolioService;
  private model: ChatOpenAI;

  constructor(portfolioService: PortfolioService) {
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize Portfolio Service
    this.portfolio = portfolioService;
    
    // Initialize OpenAI
    const openAIKey = process.env.OPENAI_API_KEY;
    if (!openAIKey) {
      throw new Error('Missing OpenAI API key');
    }
    this.model = new ChatOpenAI({
      openAIApiKey: openAIKey,
      modelName: "gpt-4",
      temperature: 0.7,
    });
  }

  private async getGlobalMetrics(): Promise<GlobalMetrics | null> {
    try {
      const { data, error } = await this.supabase
        .from('global_metrics')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching global metrics:', error);
      return null;
    }
  }

  async analyzePortfolio(): Promise<string> {
    try {
      const portfolio = await this.portfolio.getCoins();
      const globalMetrics = await this.getGlobalMetrics();

      const messages = [
        new SystemMessage("You are a cryptocurrency portfolio analyst providing detailed analysis."),
        new HumanMessage(`Analyze this portfolio and market data:

Portfolio Data:
${JSON.stringify(portfolio, null, 2)}

Global Market Metrics:
${JSON.stringify(globalMetrics, null, 2)}

Provide:
1. Overall portfolio health assessment
2. Risk analysis
3. Diversification recommendations
4. Market timing insights
5. Specific actions to consider`)
      ];

      const result = await this.model.invoke(messages);
      return result.content.toString();
    } catch (error) {
      console.error('Error analyzing portfolio:', error);
      throw error;
    }
  }

  async suggestStrategies(previousAnalysis: string): Promise<string> {
    try {
      const messages = [
        new SystemMessage("You are a cryptocurrency trading strategy advisor."),
        new HumanMessage(`Based on this portfolio analysis:
${previousAnalysis}

Suggest specific trading strategies for:
1. Market entry points
2. Exit strategies
3. Position sizing
4. Risk management rules
5. Portfolio rebalancing`)
      ];

      const result = await this.model.invoke(messages);
      return result.content.toString();
    } catch (error) {
      console.error('Error suggesting strategies:', error);
      throw error;
    }
  }

  async getRiskAssessment(): Promise<string> {
    try {
      const portfolio = await this.portfolio.getCoins();
      const globalMetrics = await this.getGlobalMetrics();

      const messages = [
        new SystemMessage("You are a cryptocurrency risk assessment specialist."),
        new HumanMessage(`Analyze these risk factors:

Portfolio:
${JSON.stringify(portfolio, null, 2)}

Market Conditions:
${JSON.stringify(globalMetrics, null, 2)}

Consider:
1. Volatility exposure
2. Correlation risks
3. Market cycle position
4. Liquidity risks
5. Concentration risks`)
      ];

      const result = await this.model.invoke(messages);
      return result.content.toString();
    } catch (error) {
      console.error('Error assessing risks:', error);
      throw error;
    }
  }

  async getMarketSentimentAnalysis(): Promise<string> {
    try {
      const portfolio = await this.portfolio.getCoins();
      const globalMetrics = await this.getGlobalMetrics();

      const messages = [
        new SystemMessage("You are a cryptocurrency market sentiment analyst."),
        new HumanMessage(`Analyze market sentiment impact:

Global Metrics:
${JSON.stringify(globalMetrics, null, 2)}

Portfolio:
${JSON.stringify(portfolio, null, 2)}

Provide insights on:
1. Market sentiment indicators
2. Trend analysis
3. Portfolio positioning
4. Opportunity areas
5. Sentiment-based risks`)
      ];

      const result = await this.model.invoke(messages);
      return result.content.toString();
    } catch (error) {
      console.error('Error analyzing market sentiment:', error);
      throw error;
    }
  }
}