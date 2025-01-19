import { PortfolioService } from '../services/portfolioService';
import { AIAnalysisService } from '../services/aiAnalysisService';

async function runPortfolioAnalysis() {
  // Initialize services
  const portfolioService = new PortfolioService('./data/portfolio.db');
  const aiAnalysis = new AIAnalysisService(portfolioService);

  try {
    // Get comprehensive portfolio analysis
    console.log('\n=== Portfolio Analysis ===');
    const analysis = await aiAnalysis.analyzePortfolio();
    console.log(analysis);

    // Get trading strategies based on analysis
    console.log('\n=== Strategy Suggestions ===');
    const strategies = await aiAnalysis.suggestStrategies(analysis);
    console.log(strategies);

    // Get risk assessment
    console.log('\n=== Risk Assessment ===');
    const risks = await aiAnalysis.getRiskAssessment();
    console.log(risks);

    // Get market sentiment analysis
    console.log('\n=== Market Sentiment Analysis ===');
    const sentiment = await aiAnalysis.getMarketSentimentAnalysis();
    console.log(sentiment);

  } catch (error) {
    console.error('Error running portfolio analysis:', error);
  }
}

// Run the analysis
runPortfolioAnalysis().catch(console.error);