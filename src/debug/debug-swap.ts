import { ChainId } from "@fusionx-finance/sdk";
import { SwapRouter } from "@fusionx-finance/smart-router/evm";
import { Percent, TradeType } from "@fusionx-finance/swap-sdk-core";
import { config } from "dotenv";
import { getContractsForChain } from "../config/chains";
import { baseMantleTestnetTokens } from "../config/mantle-testnet";
import { TokenQuoter } from "../quoter/token-quoter";
import { logger } from "../utils/logger";

config();

async function debugSwap() {
  logger.header("🔍 Debug Swap Parameters");

  const contracts = getContractsForChain(ChainId.MANTLE_SEPOLIA_TESTNET);

  const quoter = new TokenQuoter({
    rpcUrl: "https://rpc.sepolia.mantle.xyz",
    slippageTolerance: 1.0,
    maxHops: 2,
    maxSplits: 2,
    enableV2: false,
    enableV3: true,
  });

  // Get a quote
  const quote = await quoter.getQuote(
    baseMantleTestnetTokens.usdc,
    baseMantleTestnetTokens.usdt,
    "0.1",
    TradeType.EXACT_INPUT,
    false
  );

  if (!quote || !quote.rawTrade) {
    logger.error("No quote available");
    return;
  }

  const trade = quote.rawTrade;

  // Generate swap parameters
  const methodParameters = SwapRouter.swapCallParameters(trade, {
    slippageTolerance: new Percent(100, 10000), // 1%
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    recipient: "0x0000000000000000000000000000000000000001", // dummy address
  });

  logger.info("Method Parameters:", {
    to: methodParameters.to || "NOT SET",
    value: methodParameters.value,
    calldataLength: methodParameters.calldata?.length,
    calldata: methodParameters.calldata?.slice(0, 10), // First 10 chars (function selector)
  });

  logger.info("Expected Router Address:", contracts.SMART_ROUTER);

  if (!methodParameters.to) {
    logger.error("❌ WARNING: 'to' address is not set in methodParameters!");
    logger.info("This will cause a contract creation instead of a swap!");
  } else if (methodParameters.to !== contracts.SMART_ROUTER) {
    logger.error(
      `❌ WARNING: 'to' address (${methodParameters.to}) doesn't match router (${contracts.SMART_ROUTER})!`
    );
  } else {
    logger.success("✅ 'to' address correctly set to router");
  }

  // Check the trade object
  logger.info("Trade details:", {
    tradeType:
      trade.tradeType === TradeType.EXACT_INPUT
        ? "EXACT_INPUT"
        : "EXACT_OUTPUT",
    inputAmount: `${trade.inputAmount.toExact()} ${
      trade.inputAmount.currency.symbol
    }`,
    outputAmount: `${trade.outputAmount.toExact()} ${
      trade.outputAmount.currency.symbol
    }`,
    routes: trade.routes.length,
  });
}

debugSwap().catch((error) => {
  logger.error("Debug failed:", error?.message || error);
  process.exit(1);
});
