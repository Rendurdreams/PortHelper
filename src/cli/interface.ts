import inquirer from 'inquirer';
import { CMCService } from '../services/cmcService';
import { PortfolioService } from '../services/portfolioService';
import { JournalService } from '../services/journalService';
import { AIAnalysisService } from '../services/aiAnalysisService';
import { WalletService } from '../services/walletService';
import { JournalCLI } from './journalCommands';
import { WalletCLI } from './walletCommands';
import { Command } from 'commander';
import * as fs from 'fs/promises';

export class CLI {
  private cmcService: CMCService;
  private portfolio: PortfolioService;
  private journal: JournalService;
  private journalCLI: JournalCLI;
  private walletCLI: WalletCLI;
  private aiService: AIAnalysisService;

  constructor(dbPath: string, cmcApiKey: string) {
    if (!process.env.MORALIS_API_KEY) {
      throw new Error('MORALIS_API_KEY is required in environment variables');
    }
  
    this.cmcService = new CMCService(cmcApiKey);
    this.portfolio = new PortfolioService(dbPath);
    this.journal = new JournalService(dbPath);
    this.journalCLI = new JournalCLI(this.journal, this.portfolio);
    this.aiService = new AIAnalysisService(this.portfolio);
    
    // Create WalletService with the same database path
    const walletService = new WalletService(dbPath, process.env.MORALIS_API_KEY);
    this.walletCLI = new WalletCLI(walletService);
  }

  async start(): Promise<void> {
    await this.portfolio.init();
    await this.journal.init();
    
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            '--- Portfolio Management ---',
            'Add Coin to Portfolio',
            'View Portfolio',
            'Update Prices',
            'Remove Coin',
            '--- AI Analysis ---',
            'Full Portfolio Analysis',
            'Get Trading Strategies',
            'Risk Assessment',
            'Market Sentiment',
            '--- Trading Journal ---',
            'Add Journal Entry',
            'View Journal Entries',
            'View Trading Patterns',
            '--- Wallet Tracking ---',
            'Add Wallet',
            'View Wallets',
            'Check Balances',
            'View Wallet Portfolio',
            'Remove Wallet',
            '--- System ---',
            'Exit'
          ]
        }
      ]);

      try {
        switch (action) {
          // Portfolio Management
          case 'Add Coin to Portfolio':
            await this.addCoinToPortfolio();
            break;
          case 'View Portfolio':
            await this.displayPortfolio();
            break;
          case 'Update Prices':
            await this.updatePrices();
            break;
          case 'Remove Coin':
            await this.removeCoin();
            break;
          
          // AI Analysis
          case 'Full Portfolio Analysis':
            await this.runFullAnalysis();
            break;
          case 'Get Trading Strategies':
            await this.getStrategies();
            break;
          case 'Risk Assessment':
            await this.getRiskAssessment();
            break;
          case 'Market Sentiment':
            await this.getMarketSentiment();
            break;
          
          // Journal Management  
          case 'Add Journal Entry':
            await this.journalCLI.addJournalEntry();
            break;
          case 'View Journal Entries':
            await this.journalCLI.viewJournalEntries();
            break;
          case 'View Trading Patterns':
            await this.viewTradingPatterns();
            break;

          // Wallet Management
          case 'Add Wallet':
            await this.walletCLI.addWallet();
            break;
          case 'View Wallets':
            await this.walletCLI.viewWallets();
            break;
          case 'Check Balances':
            await this.walletCLI.checkBalances();
            break;
          case 'View Wallet Portfolio':
            await this.walletCLI.viewPortfolio();
            break;
          case 'Remove Wallet':
            await this.walletCLI.removeWallet();
            break;

          case 'Exit':
            console.log('Goodbye!');
            process.exit(0);
          
          // Separator handling
          case '--- Portfolio Management ---':
          case '--- AI Analysis ---':
          case '--- Trading Journal ---':
          case '--- Wallet Tracking ---':
          case '--- System ---':
            break;
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error:', error.message);
        } else {
          console.error('An unknown error occurred');
        }
      }
    }
  }

  private async addCoinToPortfolio(): Promise<void> {
    const { symbol } = await inquirer.prompt([
      {
        type: 'input',
        name: 'symbol',
        message: 'Enter coin symbol (e.g., BTC):',
        validate: (input: string) => input.trim().length > 0
      }
    ]);

    const coins = await this.cmcService.searchCoin(symbol);
    if (coins.length === 0) {
      console.log('No coins found with that symbol');
      return;
    }

    const { selectedCoin } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedCoin',
        message: 'Select the correct coin:',
        choices: coins.map(coin => ({
          name: `${coin.name} (${coin.symbol}) - CMC ID: ${coin.id}`,
          value: coin
        }))
      }
    ]);

    const { amount, strategy } = await inquirer.prompt([
      {
        type: 'number',
        name: 'amount',
        message: 'Enter the amount you hold:',
        validate: (input: number) => input > 0
      },
      {
        type: 'input',
        name: 'strategy',
        message: 'Enter your strategy for this coin (optional):'
      }
    ]);

    await this.portfolio.addCoin({
      cmc_id: selectedCoin.id,
      symbol: selectedCoin.symbol,
      name: selectedCoin.name,
      amount: amount,
      entry_price: selectedCoin.quote.USD.price,
      last_price: selectedCoin.quote.USD.price,
      strategy: strategy || undefined
    });

    console.log(`Added ${selectedCoin.name} to portfolio`);
  }

  private async displayPortfolio(): Promise<void> {
    const coins = await this.portfolio.getCoins();
    if (coins.length === 0) {
      console.log('\nPortfolio is empty. Add some coins first!\n');
      return;
    }

    console.log('\nYour Portfolio:');
    const formatted = coins.map(coin => ({
      Symbol: coin.symbol,
      Name: coin.name,
      Amount: coin.amount.toFixed(4),
      'Entry Price': `$${coin.entry_price.toFixed(2)}`,
      'Current Price': `$${coin.last_price.toFixed(2)}`,
      'Value': `$${(coin.amount * coin.last_price).toFixed(2)}`,
      'Strategy': coin.strategy || '-'
    }));

    console.table(formatted);

    const totalValue = coins.reduce((sum, coin) => sum + (coin.amount * coin.last_price), 0);
    console.log(`\nTotal Portfolio Value: $${totalValue.toFixed(2)}\n`);
  }

  private async updatePrices(): Promise<void> {
    const coins = await this.portfolio.getCoins();
    for (const coin of coins) {
      try {
        const updated = await this.cmcService.getCoinInfo(coin.cmc_id);
        await this.portfolio.updatePrice(coin.cmc_id, updated.quote.USD.price);
        console.log(`Updated ${coin.symbol} price to $${updated.quote.USD.price.toFixed(2)}`);
      } catch (error) {
        console.error(`Failed to update ${coin.symbol}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  private async removeCoin(): Promise<void> {
    const coins = await this.portfolio.getCoins();
    if (coins.length === 0) {
      console.log('\nNo coins in portfolio\n');
      return;
    }

    const { coin } = await inquirer.prompt([
      {
        type: 'list',
        name: 'coin',
        message: 'Select coin to remove:',
        choices: coins.map(c => ({
          name: `${c.name} (${c.symbol})`,
          value: c.cmc_id
        }))
      }
    ]);

    await this.portfolio.removeCoin(coin);
    console.log('Coin removed from portfolio');
  }

  private async viewTradingPatterns(): Promise<void> {
    console.log('\nAnalyzing Trading Patterns...\n');
    
    const patterns = await this.journal.getEmotionalPatterns();
    const insights = await this.journal.getStrategicInsights();

    console.log('Emotional Patterns:');
    console.table(patterns);

    console.log('\nStrategic Insights:');
    console.table(insights);

    const followUps = await this.journal.getFollowUpNeeded();
    if (followUps.length > 0) {
      console.log('\nPending Follow-ups:');
      followUps.forEach(entry => {
        console.log(`- ${entry.date.toLocaleDateString()}: ${entry.entry_type} - ${entry.entry_text.substring(0, 50)}...`);
      });
    }
  }

  private async runFullAnalysis(): Promise<void> {
    console.log('\nRunning complete portfolio analysis...');
    
    console.log('\n=== Portfolio Analysis ===');
    const analysis = await this.aiService.analyzePortfolio();
    console.log(analysis);
    
    console.log('\n=== Strategy Suggestions ===');
    const strategies = await this.aiService.suggestStrategies(analysis);
    console.log(strategies);
    
    console.log('\n=== Risk Assessment ===');
    const risks = await this.aiService.getRiskAssessment();
    console.log(risks);
    
    console.log('\n=== Market Sentiment Analysis ===');
    const sentiment = await this.aiService.getMarketSentimentAnalysis();
    console.log(sentiment);

    const { saveAnalysis } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'saveAnalysis',
        message: 'Would you like to save this analysis to a file?',
        default: false
      }
    ]);

    if (saveAnalysis) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `portfolio-analysis-${timestamp}.txt`;
      const content = `
Portfolio Analysis Report
Generated: ${new Date().toLocaleString()}

=== Portfolio Analysis ===
${analysis}

=== Strategy Suggestions ===
${strategies}

=== Risk Assessment ===
${risks}

=== Market Sentiment Analysis ===
${sentiment}
      `;

      await fs.writeFile(filename, content);
      console.log(`\nAnalysis saved to ${filename}`);
    }
  }

  private async getStrategies(): Promise<void> {
    console.log('\nGenerating trading strategies...');
    const analysis = await this.aiService.analyzePortfolio();
    const strategies = await this.aiService.suggestStrategies(analysis);
    console.log('\n=== Strategy Suggestions ===');
    console.log(strategies);
  }

  private async getRiskAssessment(): Promise<void> {
    console.log('\nAssessing portfolio risks...');
    const risks = await this.aiService.getRiskAssessment();
    console.log('\n=== Risk Assessment ===');
    console.log(risks);
  }

  private async getMarketSentiment(): Promise<void> {
    console.log('\nAnalyzing market sentiment...');
    const sentiment = await this.aiService.getMarketSentimentAnalysis();
    console.log('\n=== Market Sentiment Analysis ===');
    console.log(sentiment);
  }
}