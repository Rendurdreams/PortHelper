import { Database } from 'sqlite3';
import { promisify } from 'util';

export interface JournalEntry {
  id?: number;
  date: Date;
  entry_type: 'TRADE' | 'ANALYSIS' | 'STRATEGY' | 'REFLECTION';
  coin_id?: number;  // CMC ID if related to specific coin
  trade_type?: 'BUY' | 'SELL';
  amount?: number;
  price?: number;
  emotional_state: 'EXCITED' | 'NERVOUS' | 'CONFIDENT' | 'FEARFUL' | 'NEUTRAL';
  confidence_level: 1 | 2 | 3 | 4 | 5;
  market_sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  entry_text: string;
  lessons_learned?: string;
  follow_up_needed: boolean;
  tags: string[];
}

export class JournalService {
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
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        entry_type TEXT NOT NULL,
        coin_id INTEGER,
        trade_type TEXT,
        amount REAL,
        price REAL,
        emotional_state TEXT NOT NULL,
        confidence_level INTEGER NOT NULL,
        market_sentiment TEXT NOT NULL,
        entry_text TEXT NOT NULL,
        lessons_learned TEXT,
        follow_up_needed BOOLEAN DEFAULT FALSE,
        tags TEXT,
        FOREIGN KEY (coin_id) REFERENCES portfolio_coins(cmc_id)
      )
    `);

    // Create index for faster queries
    await this.run(`
      CREATE INDEX IF NOT EXISTS idx_journal_date 
      ON journal_entries(date)
    `);
  }

  async addEntry(entry: JournalEntry): Promise<number> {
    const result = await this.run(`
      INSERT INTO journal_entries (
        date,
        entry_type,
        coin_id,
        trade_type,
        amount,
        price,
        emotional_state,
        confidence_level,
        market_sentiment,
        entry_text,
        lessons_learned,
        follow_up_needed,
        tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      entry.date.toISOString(),
      entry.entry_type,
      entry.coin_id,
      entry.trade_type,
      entry.amount,
      entry.price,
      entry.emotional_state,
      entry.confidence_level,
      entry.market_sentiment,
      entry.entry_text,
      entry.lessons_learned,
      entry.follow_up_needed,
      JSON.stringify(entry.tags)
    ]);

    return result.lastID;
  }

  async getEntries(filters?: {
    startDate?: Date;
    endDate?: Date;
    entryType?: string;
    coinId?: number;
    emotionalState?: string;
  }): Promise<JournalEntry[]> {
    let query = 'SELECT * FROM journal_entries WHERE 1=1';
    const params: any[] = [];

    if (filters?.startDate) {
      query += ' AND date >= ?';
      params.push(filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      query += ' AND date <= ?';
      params.push(filters.endDate.toISOString());
    }
    if (filters?.entryType) {
      query += ' AND entry_type = ?';
      params.push(filters.entryType);
    }
    if (filters?.coinId) {
      query += ' AND coin_id = ?';
      params.push(filters.coinId);
    }
    if (filters?.emotionalState) {
      query += ' AND emotional_state = ?';
      params.push(filters.emotionalState);
    }

    query += ' ORDER BY date DESC';

    const entries = await this.all(query, params);
    return entries.map(entry => ({
      ...entry,
      date: new Date(entry.date),
      tags: JSON.parse(entry.tags)
    }));
  }

  async getEmotionalPatterns(): Promise<any> {
    return this.all(`
      SELECT 
        emotional_state,
        COUNT(*) as count,
        AVG(CASE WHEN trade_type = 'BUY' THEN 1 ELSE 0 END) as buy_ratio,
        AVG(confidence_level) as avg_confidence
      FROM journal_entries
      WHERE emotional_state IS NOT NULL
      GROUP BY emotional_state
    `);
  }

  async getStrategicInsights(): Promise<any> {
    return this.all(`
      SELECT 
        je.entry_type,
        je.market_sentiment,
        COUNT(*) as count,
        AVG(je.confidence_level) as avg_confidence,
        GROUP_CONCAT(DISTINCT je.tags) as common_tags
      FROM journal_entries je
      WHERE je.entry_type = 'TRADE'
      GROUP BY je.entry_type, je.market_sentiment
    `);
  }

  async getFollowUpNeeded(): Promise<JournalEntry[]> {
    const entries = await this.all(`
      SELECT * FROM journal_entries
      WHERE follow_up_needed = TRUE
      ORDER BY date DESC
    `);

    return entries.map(entry => ({
      ...entry,
      date: new Date(entry.date),
      tags: JSON.parse(entry.tags)
    }));
  }
}