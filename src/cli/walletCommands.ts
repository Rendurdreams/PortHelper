// src/cli/walletCommands.ts
import inquirer from 'inquirer';
import { WalletService } from '../services/walletService';

export class WalletCLI {
  constructor(private walletService: WalletService) {}

  async addWallet(): Promise<void> {
    const { address, network, label } = await inquirer.prompt([
      {
        type: 'input',
        name: 'address',
        message: 'Enter wallet address:',
        validate: (input: string) => input.length > 0
      },
      {
        type: 'list',
        name: 'network',
        message: 'Select network:',
        choices: ['mainnet', 'devnet']
      },
      {
        type: 'input',
        name: 'label',
        message: 'Enter a label for this wallet (optional):'
      }
    ]);

    try {
      await this.walletService.addWallet(address, network, label);
      console.log('Wallet added successfully!');
    } catch (error) {
      console.error('Error adding wallet:', error);
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
        Address: w.address,
        Network: w.network,
        'Tracked Since': new Date(w.tracked_since).toLocaleString()
      })));
    } catch (error) {
      console.error('Error fetching wallets:', error);
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
            name: `${w.label || w.address} (${w.network})`,
            value: w
          }))
        }
      ]);

      console.log('\nFetching balances...\n');

      const [solBalance, tokens] = await Promise.all([
        this.walletService.getNativeBalance(selectedWallet.network, selectedWallet.address),
        this.walletService.getTokenBalances(selectedWallet.network, selectedWallet.address)
      ]);

      console.log(`SOL Balance: ${solBalance} SOL`);
      
      if (tokens && tokens.length > 0) {
        console.log('\nToken Balances:');
        console.table(tokens.map(token => ({
          Symbol: token.symbol || 'Unknown',
          Amount: token.amount / Math.pow(10, token.decimals),
          'Token Address': token.mint
        })));
      } else {
        console.log('\nNo token balances found.');
      }
    } catch (error) {
      console.error('Error checking balances:', error);
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
            name: `${w.label || w.address} (${w.network})`,
            value: w
          }))
        }
      ]);

      console.log('\nFetching portfolio...\n');
      const portfolio = await this.walletService.getPortfolio(selectedWallet.network, selectedWallet.address);
      
      console.log('\nPortfolio Summary:');
      console.table(portfolio);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
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
            name: `${w.label || w.address} (${w.network})`,
            value: w
          }))
        }
      ]);

      await this.walletService.removeWallet(selectedWallet.address);
      console.log('Wallet removed successfully!');
    } catch (error) {
      console.error('Error removing wallet:', error);
    }
  }
}