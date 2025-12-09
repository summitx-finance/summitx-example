# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SummitX Swap Example - a production-ready TypeScript example demonstrating token swaps on Base Camp testnet using the SummitX Smart Router. Uses viem for blockchain interactions and SummitX SDK packages for DEX routing.

## Commands

```bash
npm run swap          # Execute swap example (main entry point)
npm run build         # Build with tsup
npm run typecheck     # TypeScript validation
npm run lint          # ESLint
```

## Architecture

**Entry Point**: `src/execute-swap-example.ts` - Complete swap workflow demonstrating:
1. Wallet setup with viem clients
2. Balance checks via ERC20 contract calls
3. Quote fetching through TokenQuoter
4. Transaction building with SwapRouter
5. Token approval handling
6. Swap execution and result verification

**Core Components**:
- `src/quoter/token-quoter.ts` - TokenQuoter class that wraps SmartRouter for optimal route discovery across V2, V3, and Stable pools. Fetches candidate pools from subgraphs, creates quote providers, and returns QuoteResult with raw trade data.
- `src/config/base-testnet.ts` - Chain config, contract addresses, and pre-configured Token instances for Base Camp testnet (chain ID 123420001114).
- `src/utils/quote-to-trade-converter-v2.ts` - Fallback converter for legacy QuoteResult to SmartRouterTrade (prefer using rawTrade from QuoteResult).

**Key Dependencies**:
- `@summitx/smart-router` - Route discovery and SwapRouter for transaction building
- `@summitx/swap-sdk-core` - TradeType, Percent, CurrencyAmount primitives
- `viem` - Wallet/public clients, transaction handling

## Configuration

Environment variable `PRIVATE_KEY` required in `.env` for transaction signing.

Swap parameters configured in `SWAP_CONFIG` object at top of execute-swap-example.ts:
- `inputToken`/`outputToken` - Token objects from `baseCampTestnetTokens`
- `inputAmount` - Amount in token units (string)
- `slippagePercent` - Tolerance as decimal (1.0 = 1%)

TokenQuoter options: `maxHops`, `maxSplits`, `distributionPercent`, `slippageTolerance`.
