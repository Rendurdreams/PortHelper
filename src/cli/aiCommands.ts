import { Command } from 'commander';
import { PortfolioService } from '../services/portfolioService';
import { AIAnalysisService } from '../services/aiAnalysisService';

export function registerAICommands(program: Command, dbPath: string) {
  const portfolioService = new PortfolioService(dbPath);
  const aiService = new AIAnalysisService(portfolioService);

  const ai = program.command('ai')
    .description('AI-powered portfolio analysis commands');

  ai
    .command('analyze')
    .description('Get comprehensive portfolio analysis')
    .action(async () => {
      try {
        console.log('Analyzing portfolio...');
        const analysis = await aiService.analyzePortfolio();
        console.log('\n=== Portfolio Analysis ===');
        console.log(analysis);
      } catch (error) {
        console.error('Error analyzing portfolio:', error);
      }
    });

  ai
    .command('strategy')
    .description('Get trading strategy suggestions')
    .action(async () => {
      try {
        console.log('Generating strategy suggestions...');
        const analysis = await aiService.analyzePortfolio();
        const strategies = await aiService.suggestStrategies(analysis);
        console.log('\n=== Strategy Suggestions ===');
        console.log(strategies);
      } catch (error) {
        console.error('Error generating strategies:', error);
      }
    });

  ai
    .command('risk')
    .description('Get risk assessment')
    .action(async () => {
      try {
        console.log('Assessing portfolio risks...');
        const risks = await aiService.getRiskAssessment();
        console.log('\n=== Risk Assessment ===');
        console.log(risks);
      } catch (error) {
        console.error('Error assessing risks:', error);
      }
    });

  ai
    .command('sentiment')
    .description('Get market sentiment analysis')
    .action(async () => {
      try {
        console.log('Analyzing market sentiment...');
        const sentiment = await aiService.getMarketSentimentAnalysis();
        console.log('\n=== Market Sentiment Analysis ===');
        console.log(sentiment);
      } catch (error) {
        console.error('Error analyzing market sentiment:', error);
      }
    });

  ai
    .command('full')
    .description('Run all analyses')
    .action(async () => {
      try {
        console.log('Running complete portfolio analysis...');
        
        console.log('\n=== Portfolio Analysis ===');
        const analysis = await aiService.analyzePortfolio();
        console.log(analysis);
        
        console.log('\n=== Strategy Suggestions ===');
        const strategies = await aiService.suggestStrategies(analysis);
        console.log(strategies);
        
        console.log('\n=== Risk Assessment ===');
        const risks = await aiService.getRiskAssessment();
        console.log(risks);
        
        console.log('\n=== Market Sentiment Analysis ===');
        const sentiment = await aiService.getMarketSentimentAnalysis();
        console.log(sentiment);
      } catch (error) {
        console.error('Error running full analysis:', error);
      }
    });
}