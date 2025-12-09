# SummitX Token Swap Example

A production-ready example demonstrating how to execute token swaps on Base Camp testnet using the SummitX Smart Router.

## Features

- 🚀 **Optimal Route Finding** - Automatically finds the best swap routes across V2, V3, and Stable pools
- 💰 **Multi-Pool Aggregation** - Splits trades across multiple pools for better prices
- 🛡️ **Slippage Protection** - Built-in slippage tolerance to protect against price movements
- ⚡ **Gas Optimization** - Efficient routing to minimize transaction costs
- 🔄 **Multi-Hop Support** - Swaps through intermediate tokens when direct routes aren't available

## Prerequisites

- Node.js 18+ and npm/yarn
- A wallet with:
  - CAMP tokens for gas fees
  - Tokens to swap (USDC, T12ETH, etc.)
- Private key for transaction signing

## Installation

```bash
# Clone the repository
git clone https://github.com/summitx-finance/summitx-example.git
cd summitx-swap-example

# Install dependencies
npm install
# or
yarn install
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Add your private key to `.env`:
```
PRIVATE_KEY=0x... # Your wallet private key
```

⚠️ **Security Warning**: Never commit your private key to version control!

## Quick Start

Run the swap example:

```bash
npm run swap
# or
yarn swap
```

This will execute a swap of 10 USDC to T12ETH on Base Camp testnet.

## Customization

Edit the configuration in `src/execute-swap-example.ts`:

```typescript
const SWAP_CONFIG = {
  inputToken: baseCampTestnetTokens.usdc,    // Token to swap from
  outputToken: baseCampTestnetTokens.t12eth, // Token to swap to
  inputAmount: "10",                         // Amount to swap
  slippagePercent: 1.0,                      // 1% slippage tolerance
}
```

### Available Tokens

- **USDC** - USD Coin (6 decimals)
- **T12ETH** - Test ETH with 12 decimals
- **WCAMP** - Wrapped CAMP
- **SUMMIT** - Summit Token
- **USDT** - Tether USD

### Advanced Options

```typescript
const quoter = new TokenQuoter({
  rpcUrl: "your-rpc-url",
  slippageTolerance: 1.0,
  maxHops: 3,      // Maximum intermediate tokens
  maxSplits: 3,    // Maximum route splits
})
```

## How It Works

1. **Get Quote**: Finds optimal swap routes using the SummitX Smart Router
2. **Check Approval**: Ensures the router can spend your tokens
3. **Execute Swap**: Sends the swap transaction with slippage protection
4. **Verify Results**: Confirms the swap and checks final balances

## Example Output

```
════════════════════════════════════════════════════════════
SummitX Smart Router Swap Example
════════════════════════════════════════════════════════════
[SUCCESS] Wallet connected: 0x742d35Cc6634C0532925a3b844Bc9e7595f1234

════════════════════════════════════════════════════════════
Step 2: Checking Token Balances
════════════════════════════════════════════════════════════
[INFO] USDC Balance: 1000.0

════════════════════════════════════════════════════════════
Step 3: Getting Swap Quote
════════════════════════════════════════════════════════════
[SUCCESS] Quote received:
{
  "input": "10 USDC",
  "expectedOutput": "8.234567 T12ETH",
  "minimumOutput": "8.151223 T12ETH",
  "priceImpact": "0.23%",
  "route": ["(100% [USDC-T12ETH V3 0.3% 0x...])"]
}

════════════════════════════════════════════════════════════
Step 6: Executing Swap
════════════════════════════════════════════════════════════
[INFO] Swap transaction sent: 0x123...abc
[SUCCESS] Swap completed successfully! 🎉
```

## API Reference

### TokenQuoter

```typescript
const quoter = new TokenQuoter(options)

// Get a swap quote
const quote = await quoter.getQuote(
  inputToken,    // Token to swap from
  outputToken,   // Token to swap to
  amount,        // Amount as string
  tradeType,     // EXACT_INPUT or EXACT_OUTPUT
  adjustForGas   // Include gas costs in quote
)
```

### SwapRouter

```typescript
// Build swap transaction
const { calldata, value } = SwapRouter.swapCallParameters(
  trade,         // Trade object from quoter
  {
    slippageTolerance,      // Percent object
    recipient,              // Receiver address
    deadlineOrPreviousBlockhash // Expiry time
  }
)
```

## Network Support

Currently configured for Base Camp testnet. To use other networks:

1. Update chain configuration in the example
2. Change router addresses
3. Update token addresses

## Common Issues

### "Insufficient balance"
- Ensure you have enough tokens to swap
- Check you have CAMP for gas fees

### "No swap route found"
- Verify liquidity exists for your token pair
- Try a smaller amount
- Check token addresses are correct

### "Transaction failed"
- Increase slippage tolerance
- Check gas price settings
- Verify token approvals

## Development

### Project Structure
```
src/
├── execute-swap-example.ts    # Main swap example
├── quoter/
│   └── token-quoter.ts       # Quote fetching logic
├── config/
│   └── base-testnet.ts       # Network configuration
└── utils/
    └── logger.ts             # Logging utilities
```

### Running Tests
```bash
npm run typecheck  # Type checking
npm run lint       # Linting
```

### Building
```bash
npm run build
```

## Security Considerations

- Never expose private keys in code
- Always verify token addresses
- Use appropriate slippage settings
- Monitor for sandwich attacks
- Test with small amounts first

## Resources

- [SummitX Documentation](https://summitx.gitbook.io/docs)
- [Base Camp Testnet Faucet](https://faucet.campnetwork.xyz)
- [Block Explorer](https://basecamp.cloud.blockscout.com)

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Support

- Discord: [Join our community](https://discord.gg/summitx-finance)
- Twitter: [@summitxfinance](https://x.com/summitx_finance)
- Email: bruce@summitx.finance
