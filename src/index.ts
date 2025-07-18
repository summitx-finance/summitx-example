// Export main functionality
export { TokenQuoter, type QuoteResult, type TokenQuoterOptions } from "./quoter/token-quoter"
export { baseCampTestnetTokens, BASECAMP_TESTNET, createBaseTestnetClient } from "./config/base-testnet"
export { logger } from "./utils/logger"

// Re-export types from dependencies for convenience
export { TradeType, Currency, CurrencyAmount, Token, Percent } from "@summitx/swap-sdk-core"
export { ChainId } from "@summitx/chains"
export { SwapRouter } from "@summitx/smart-router/evm"
export type { PublicClient } from "viem"