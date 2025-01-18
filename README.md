# PortHelper - Crypto Portfolio Manager

A modular cryptocurrency portfolio management system with trade journaling and AI assistance capabilities.

## Project Overview

PortHelper is designed to be a comprehensive cryptocurrency portfolio management tool that combines:
- Portfolio tracking with CoinMarketCap integration
- Detailed trade journaling
- Trading psychology analysis
- (Future) AI-powered trading insights
- (Future) Integration with external market data

## Installation

```bash
# Clone the repository
git clone [your-repo-url]
cd PortHelper

# Install dependencies
npm install

# Create data directory
mkdir data

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

## Current Features

### Portfolio Management
- Track cryptocurrency holdings with CMC IDs
- Real-time price updates
- Portfolio valuation
- Add/remove coins from portfolio

### Trading Journal
- Record detailed trade entries
- Track emotional state and confidence levels
- Document market sentiment
- Tag entries for better organization
- View trading patterns and insights

## Project Structure

```
PortHelper/
├── src/
│   ├── cli/               # CLI interface
│   │   ├── interface.ts   # Main CLI
│   │   └── journalCommands.ts # Journal commands
│   ├── services/          # Core services
│   │   ├── cmcService.ts  # CoinMarketCap integration
│   │   ├── portfolioService.ts # Portfolio management
│   │   └── journalService.ts # Journal functionality
│   ├── db/               # Database operations
│   │   └── schema.ts
│   └── index.ts         # Entry point
├── data/                # SQLite database location
├── package.json
└── tsconfig.json
```

## Key Components

### CMC Service
- Handles all CoinMarketCap API interactions
- Caches responses to avoid rate limiting
- Manages coin metadata and pricing

### Portfolio Service
- Manages user's cryptocurrency holdings
- Tracks entry prices and current values
- Handles portfolio updates

### Journal Service
- Records trade entries and reflections
- Tracks trading psychology
- Analyzes patterns in trading behavior

## Environment Variables

```env
DB_PATH=./data/portfolio.db
CMC_API_KEY=your_cmc_api_key_here
```

## Upcoming Features

### Phase 1: Data Integration
- [ ] Connect to existing Supabase database
- [ ] Integrate global metrics
- [ ] Add historical price data
- [ ] Real-time price updates

### Phase 2: AI Integration
- [ ] Implement LangChain for analysis
- [ ] Add trading pattern recognition
- [ ] Implement strategy recommendations
- [ ] Add market sentiment analysis

### Phase 3: Enhanced Analysis
- [ ] Twitter sentiment integration
- [ ] News aggregation
- [ ] Custom strategy implementation
- [ ] Risk management features

### Phase 4: UI Development
- [ ] Web interface
- [ ] Real-time updates
- [ ] Interactive charts
- [ ] Strategy visualization

## Development Notes

### Current Progress (January 18, 2025)
- Implemented basic portfolio management
- Added CMC integration
- Created journal system
- Set up SQLite database

### Next Steps
1. Integrate with existing data fetcher
2. Implement AI analysis layer
3. Add strategy templates
4. Enhance journal analytics

### Important Functions

```typescript
// Portfolio Management
addCoinToPortfolio()      // Add new coin with CMC data
updatePrices()            // Update all coin prices
getPortfolioValue()       // Calculate total portfolio value

// Journal System
addJournalEntry()         // Record new journal entry
getEmotionalPatterns()    // Analyze trading psychology
getStrategicInsights()    // Analyze trading patterns

// Database Operations
initializeDatabase()      // Set up database schema
addCoin()                // Add coin to database
getHoldings()            // Get current holdings
```

## Usage

```bash
# Start the CLI
npm start

# Development mode
npm run dev

# Run tests
npm test
```

## Technical Requirements
- Node.js >= 16
- TypeScript
- SQLite
- CoinMarketCap API key

## Notes for Next Session
When continuing development, key areas to focus on:
1. Implement AI analysis using LangChain
2. Connect to your existing Supabase database
3. Add more portfolio analytics
4. Enhance journal pattern recognition

Remember to check the existing data fetcher integration points and ensure the modular structure is maintained.
