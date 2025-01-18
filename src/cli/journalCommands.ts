import inquirer from 'inquirer';
import { JournalService, JournalEntry } from '../services/journalService';
import { PortfolioService } from '../services/portfolioService';

export class JournalCLI {
  constructor(
    private journalService: JournalService,
    private portfolioService: PortfolioService
  ) {}

  async addJournalEntry(): Promise<void> {
    const { entryType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'entryType',
        message: 'What type of journal entry?',
        choices: ['TRADE', 'ANALYSIS', 'STRATEGY', 'REFLECTION']
      }
    ]);

    let entry: Partial<JournalEntry> = {
      date: new Date(),
      entry_type: entryType as JournalEntry['entry_type']
    };

    if (entryType === 'TRADE') {
      const coins = await this.portfolioService.getCoins();
      if (coins.length === 0) {
        console.log('No coins in portfolio. Please add coins first.');
        return;
      }

      const tradeAnswers = await inquirer.prompt([
        {
          type: 'list',
          name: 'coin_id',
          message: 'Select coin:',
          choices: coins.map(c => ({
            name: `${c.name} (${c.symbol})`,
            value: c.cmc_id
          }))
        },
        {
          type: 'list',
          name: 'trade_type',
          message: 'Trade type:',
          choices: ['BUY', 'SELL']
        },
        {
          type: 'number',
          name: 'amount',
          message: 'Amount:',
          validate: (input: number) => input > 0 || 'Please enter a valid amount'
        },
        {
          type: 'number',
          name: 'price',
          message: 'Price (USD):',
          validate: (input: number) => input > 0 || 'Please enter a valid price'
        }
      ]);
      
      Object.assign(entry, tradeAnswers);
    }

    // First part of the entry
    const mainAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'emotional_state',
        message: 'How are you feeling about this?',
        choices: ['EXCITED', 'NERVOUS', 'CONFIDENT', 'FEARFUL', 'NEUTRAL']
      },
      {
        type: 'list',
        name: 'confidence_level',
        message: 'Rate your confidence level (1-5):',
        choices: [1, 2, 3, 4, 5]
      },
      {
        type: 'list',
        name: 'market_sentiment',
        message: 'Current market sentiment:',
        choices: ['BULLISH', 'BEARISH', 'NEUTRAL']
      }
    ]);

    // Detailed text entry
    console.log('\nEnter your detailed thoughts (press Enter twice to finish):');
    let entryText = '';
    const rl = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise<void>((resolve) => {
      let lastLineEmpty = false;
      rl.on('line', (line: string) => {
        if (line === '' && lastLineEmpty) {
          rl.close();
          resolve();
        } else {
          if (line !== '') {
            entryText += line + '\n';
            lastLineEmpty = false;
          } else {
            lastLineEmpty = true;
          }
        }
      });
    });

    // Lessons learned
    console.log('\nEnter lessons learned (press Enter twice to finish):');
    let lessonsText = '';
    const rl2 = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise<void>((resolve) => {
      let lastLineEmpty = false;
      rl2.on('line', (line: string) => {
        if (line === '' && lastLineEmpty) {
          rl2.close();
          resolve();
        } else {
          if (line !== '') {
            lessonsText += line + '\n';
            lastLineEmpty = false;
          } else {
            lastLineEmpty = true;
          }
        }
      });
    });

    // Final questions
    const finalAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'follow_up_needed',
        message: 'Does this need follow-up?',
        default: false
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Enter tags (comma-separated):',
        filter: (input: string) => input.split(',').map(tag => tag.trim()).filter(Boolean)
      }
    ]);

    const fullEntry: JournalEntry = {
      ...entry as JournalEntry,
      ...mainAnswers,
      entry_text: entryText.trim(),
      lessons_learned: lessonsText.trim(),
      follow_up_needed: finalAnswers.follow_up_needed,
      tags: finalAnswers.tags
    };

    await this.journalService.addEntry(fullEntry);
    console.log('\nJournal entry added successfully!');
    
    // Display the entry to confirm it was saved correctly
    console.log('\nEntry Preview:');
    console.log('-------------');
    console.log('Entry Text:');
    console.log(fullEntry.entry_text);
    if (fullEntry.lessons_learned) {
      console.log('\nLessons Learned:');
      console.log(fullEntry.lessons_learned);
    }
  }

  async viewJournalEntries(): Promise<void> {
    const { filter } = await inquirer.prompt([
      {
        type: 'list',
        name: 'filter',
        message: 'View entries by:',
        choices: [
          'All Entries',
          'Recent Entries',
          'Trade Entries',
          'Follow-up Needed',
          'Emotional Patterns',
          'Strategic Insights'
        ]
      }
    ]);

    try {
      switch (filter) {
        case 'All Entries':
          await this.displayEntries(await this.journalService.getEntries());
          break;
        case 'Recent Entries': {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          await this.displayEntries(
            await this.journalService.getEntries({ startDate })
          );
          break;
        }
        case 'Trade Entries':
          await this.displayEntries(
            await this.journalService.getEntries({ entryType: 'TRADE' })
          );
          break;
        case 'Follow-up Needed':
          await this.displayEntries(await this.journalService.getFollowUpNeeded());
          break;
        case 'Emotional Patterns': {
          const patterns = await this.journalService.getEmotionalPatterns();
          console.log('\nEmotional Trading Patterns:');
          console.table(patterns);
          break;
        }
        case 'Strategic Insights': {
          const insights = await this.journalService.getStrategicInsights();
          console.log('\nStrategic Insights:');
          console.table(insights);
          break;
        }
      }
    } catch (error) {
      console.error('Error viewing entries:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async displayEntries(entries: JournalEntry[]): Promise<void> {
    if (entries.length === 0) {
      console.log('\nNo entries found.');
      return;
    }

    for (const entry of entries) {
      console.log('\n-------------------');
      console.log(`Date: ${entry.date.toLocaleString()}`);
      console.log(`Type: ${entry.entry_type}`);
      if (entry.coin_id) {
        const coin = await this.portfolioService.getCoin(entry.coin_id);
        if (coin) {
          console.log(`Coin: ${coin.symbol}`);
        }
      }
      if (entry.trade_type) {
        console.log(`Trade Type: ${entry.trade_type}`);
        console.log(`Amount: ${entry.amount}`);
        console.log(`Price: $${entry.price}`);
      }
      console.log(`Emotional State: ${entry.emotional_state}`);
      console.log(`Confidence: ${entry.confidence_level}/5`);
      console.log(`Market Sentiment: ${entry.market_sentiment}`);
      console.log('\nEntry:');
      console.log(entry.entry_text);
      if (entry.lessons_learned) {
        console.log('\nLessons Learned:');
        console.log(entry.lessons_learned);
      }
      console.log(`\nTags: ${entry.tags.join(', ')}`);
      if (entry.follow_up_needed) {
        console.log('⚠️ Follow-up needed');
      }
      console.log('-------------------');
    }
  }
}