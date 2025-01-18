import { CLI } from './cli/interface';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'portfolio.db');
  const cmcApiKey = process.env.CMC_API_KEY;

  if (!cmcApiKey) {
    console.error('Error: CMC_API_KEY not found in environment variables');
    process.exit(1);
  }
  
  try {
    const cli = new CLI(dbPath, cmcApiKey);
    await cli.start();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main().catch(console.error);