import { config } from "dotenv"
import { TradeType } from "@summitx/swap-sdk-core"
import { TokenQuoter } from "../quoter/token-quoter"
import { megaEthTestnetTokens } from "../config/megaeth-testnet"
import { logger } from "../utils/logger"

// Load environment variables
config()

async function main() {
  logger.header("SummitX Smart Router Token Quoter - Base Testnet Demo")

  // Initialize token quoter with smart router (same as UI)
  const quoter = new TokenQuoter({
    rpcUrl: "https://timothy.megaeth.com/mafia/rpc/n0m3q6w9e2r5t8y1u4i7o0p3a6s9d2f5g8h1j4k7/8708df38d9cc4bb39ac813ae005be495",
    slippageTolerance: 0.5, // 0.5% slippage
    maxHops: 3,
    maxSplits: 3,
    useStaticPools: false, // Use dynamic pool fetching like UI
    useMockPools: false, // Use real pools
  })

  // Test USDC to WETH quote
  logger.info("Testing USDC → WETH quote...")
  
  try {
    const quote = await quoter.getQuote(
      megaEthTestnetTokens.usdc,
      megaEthTestnetTokens.weth,
      "1000000", // 1 USDC (6 decimals)
      TradeType.EXACT_INPUT,
      true // shouldAdjustQuoteForGas
    )

    if (quote) {
      logger.success("✅ USDC → WETH Quote Found!", {
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        priceImpact: quote.priceImpact,
        route: quote.route,
        pools: quote.pools,
        gasEstimate: quote.gasEstimate,
        executionPrice: quote.executionPrice,
        minimumReceived: quote.minimumReceived,
        routerTime: quote.routerTime,
      })
    } else {
      logger.warn("❌ No route found for USDC → WETH")
    }
  } catch (error: any) {
    if (error?.message?.includes("429")) {
      logger.error("❌ Rate limited - try again later");
    } else {
      logger.error("❌ Error getting USDC → WETH quote:", error?.message || error);
    }
  }

  // Test WBTC to DAI quote
  logger.info("Testing WETH → DAI quote...")
  
  try {
    const quote = await quoter.getQuote(
      megaEthTestnetTokens.weth,
      megaEthTestnetTokens.dai,
      "1000000000000000000", // 1 WBTC (18 decimals)
      TradeType.EXACT_INPUT,
      true // shouldAdjustQuoteForGas
    )

    if (quote) {
      logger.success("✅ WETH → DAI Quote Found!", {
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        priceImpact: quote.priceImpact,
        route: quote.route,
        pools: quote.pools,
        gasEstimate: quote.gasEstimate,
        executionPrice: quote.executionPrice,
        minimumReceived: quote.minimumReceived,
        routerTime: quote.routerTime,
      })
    } else {
      logger.warn("❌ No route found for WETH → DAI")
    }
  } catch (error: any) {
    if (error?.message?.includes("429")) {
      logger.error("❌ Rate limited - try again later");
    } else {
      logger.error("❌ Error getting WETH → DAI quote:", error?.message || error);
    }
  }

  // Test USDT to USDC quote (stablecoin pair)
  logger.info("Testing USDT → USDC quote...")
  
  try {
    const quote = await quoter.getQuote(
      megaEthTestnetTokens.usdt,
      megaEthTestnetTokens.usdc,
      "1000000", // 1 USDT (6 decimals)
      TradeType.EXACT_INPUT,
      true // shouldAdjustQuoteForGas
    )

    if (quote) {
      logger.success("✅ USDT → USDC Quote Found!", {
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        priceImpact: quote.priceImpact,
        route: quote.route,
        pools: quote.pools,
        gasEstimate: quote.gasEstimate,
        executionPrice: quote.executionPrice,
        minimumReceived: quote.minimumReceived,
        routerTime: quote.routerTime,
      })
    } else {
      logger.warn("❌ No route found for USDT → USDC")
    }
  } catch (error: any) {
    if (error?.message?.includes("429")) {
      logger.error("❌ Rate limited - try again later");
    } else {
      logger.error("❌ Error getting USDT → USDC quote:", error?.message || error);
    }
  }

  logger.success("Smart router examples completed!")
  logger.info("Note: This now uses the actual smart router like the UI. If no pools are available on Base testnet, the quotes may fail.")
}

// Run the examples
main().catch((error: any) => {
  if (error?.message?.includes("429")) {
    logger.error("⚠️ Rate limited - try again later");
  } else {
    logger.error("Failed to run examples:", error?.message || error);
  }
  process.exit(1);
})

// Export for programmatic usage
export { TokenQuoter } from "../quoter/token-quoter"
export {  megaEthTestnetTokens } from "../config/megaeth-testnet"
export { logger } from "../utils/logger"
