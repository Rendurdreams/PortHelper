import inquirer from 'inquirer';
import { WalletService } from '../services/walletService';

export class WalletCLI {
  constructor(private walletService: WalletService) {}

  async addWallet(): Promise<void> {
    try {
      const { network } = await inquirer.prompt([
        {
          type: 'list',
          name: 'network',
          message: 'Select network:',
          choices: [
            { name: 'Ethereum', value: 'eth_mainnet' },
            { name: 'Solana', value: 'sol_mainnet' }
          ]
        }
      ]);

      const { address } = await inquirer.prompt([
        {
          type: 'input',
          name: 'address',
          message: 'Enter wallet address:',
          validate: (input: string) => {
            if (!input.length) return 'Address cannot be empty';
            
            if (network === 'eth_mainnet') {
              return input.startsWith('0x') && input.length === 42 
                ? true 
                : 'Invalid Ethereum address format (should start with 0x and be 42 characters)';
            } else {
              return input.length === 44
                ? true 
                : 'Invalid Solana address format (should be 44 characters)';
            }
          }
        }
      ]);

      const { label } = await inquirer.prompt([
        {
          type: 'input',
          name: 'label',
          message: 'Enter a label for this wallet (optional):'
        }
      ]);

      console.log('\nVerifying wallet...');
      await this.walletService.addWallet(address, network, label);
      console.log('Wallet added successfully!');
      
    } catch (error) {
      console.error('Error adding wallet:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async viewWallets(): Promise<void> {
    try {
      const wallets = await this.walletService.getTrackedWallets();
      
      if (!wallets || wallets.length === 0) {
        console.log('\nNo wallets being tracked.\n');
        return;
      }

      console.log('\nTracked Wallets:');
      console.table(wallets.map(w => ({
        Label: w.label || '-',
        Address: this.formatAddress(w.address),
        Network: w.network === 'eth_mainnet' ? 'Ethereum' : 'Solana',
        'Tracked Since': new Date(w.tracked_since).toLocaleString()
      })));
    } catch (error) {
      console.error('Error fetching wallets:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async checkBalances(): Promise<void> {
    try {
      const wallets = await this.walletService.getTrackedWallets();
      
      if (!wallets || wallets.length === 0) {
        console.log('\nNo wallets being tracked.\n');
        return;
      }

      const { selectedWallet } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedWallet',
          message: 'Select wallet to check:',
          choices: wallets.map(w => ({
            name: `${w.label || this.formatAddress(w.address)} (${w.network === 'eth_mainnet' ? 'Ethereum' : 'Solana'})`,
            value: w
          }))
        }
      ]);

      console.log('\nFetching balances...\n');

      // Get native balance and tokens
      const nativeBalance = await this.walletService.getNativeBalance(selectedWallet.network, selectedWallet.address);
      console.log(`Native Balance: ${nativeBalance} ${selectedWallet.network === 'eth_mainnet' ? 'ETH' : 'SOL'}`);

      const tokens = await this.walletService.getTokenBalances(selectedWallet.network, selectedWallet.address);
      
      if (tokens && tokens.length > 0) {
        console.log('\nToken Balances:');
        const formattedTokens = tokens.map(token => ({
          Symbol: token.symbol || 'Unknown',
          Name: token.name || 'Unknown Token',
          Balance: this.formatTokenAmount(token.balance, token.decimals),
          Address: this.formatAddress(token.token_address)
        }));
        console.table(formattedTokens);
      } else {
        console.log('\nNo token balances found.');
      }
    } catch (error) {
      console.error('Error checking balances:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async viewPortfolio(): Promise<void> {
    try {
      const wallets = await this.walletService.getTrackedWallets();
      
      if (!wallets || wallets.length === 0) {
        console.log('\nNo wallets being tracked.\n');
        return;
      }

      const { selectedWallet } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedWallet',
          message: 'Select wallet:',
          choices: wallets.map(w => ({
            name: `${w.label || this.formatAddress(w.address)} (${w.network === 'eth_mainnet' ? 'Ethereum' : 'Solana'})`,
            value: w
          }))
        }
      ]);

      console.log('\nFetching portfolio...\n');
      
      const portfolio = await this.walletService.getPortfolio(selectedWallet.network, selectedWallet.address);
      
      // Display native balance
      console.log(`Native Balance: ${portfolio.nativeBalance} ${selectedWallet.network === 'eth_mainnet' ? 'ETH' : 'SOL'}\n`);
      
      if (portfolio.tokens && portfolio.tokens.length > 0) {
        console.log('Token Holdings:');
        const formattedTokens = portfolio.tokens.map((token: any) => ({
          Symbol: token.symbol || 'Unknown',
          Name: token.name || 'Unknown Token',
          Balance: this.formatTokenAmount(token.balance, token.decimals),
          Address: this.formatAddress(token.address)
        }));
        console.table(formattedTokens);
      } else {
        console.log('No token holdings found.');
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async removeWallet(): Promise<void> {
    try {
      const wallets = await this.walletService.getTrackedWallets();
      
      if (!wallets || wallets.length === 0) {
        console.log('\nNo wallets being tracked.\n');
        return;
      }

      const { selectedWallet } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedWallet',
          message: 'Select wallet to remove:',
          choices: wallets.map(w => ({
            name: `${w.label || this.formatAddress(w.address)} (${w.network === 'eth_mainnet' ? 'Ethereum' : 'Solana'})`,
            value: w
          }))
        }
      ]);

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to remove this wallet?',
          default: false
        }
      ]);

      if (confirm) {
        await this.walletService.removeWallet(selectedWallet.address);
        console.log('Wallet removed successfully!');
      }
    } catch (error) {
      console.error('Error removing wallet:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Helper methods
  private formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  private formatTokenAmount(balance: string, decimals: number): string {
    try {
      const amount = Number(balance) / Math.pow(10, decimals);
      return amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
    } catch (error) {
      return '0.00';
    }
  }
}