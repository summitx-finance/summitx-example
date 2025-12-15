import { ChainId } from "@fusionx-finance/sdk";
import { SwapRouter } from "@fusionx-finance/smart-router/evm";
import { Percent, TradeType } from "@fusionx-finance/swap-sdk-core";
import { config } from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getContractsForChain } from "../config/chains";
import {
  baseMantleTestnetTokens,
  mantleSepoliaTestnet,
} from "../config/mantle-testnet";
import { TokenQuoter } from "../quoter/token-quoter";
import { logger } from "../utils/logger";

config();

async function testSimpleSwap() {
  logger.header("🧪 Test Simple Native Swap");

  const contracts = getContractsForChain(ChainId.MANTLE_SEPOLIA_TESTNET);

  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

  const publicClient = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http("https://rpc.sepolia.mantle.xyz"),
  });

  const walletClient = createWalletClient({
    account,
    chain: mantleSepoliaTestnet,
    transport: http("https://rpc.sepolia.mantle.xyz"),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  logger.info(`Balance: ${formatEther(balance)} MANTLE`);

  // Get quote for small amount
  const quoter = new TokenQuoter({
    rpcUrl: "https://rpc.sepolia.mantle.xyz",
    slippageTolerance: 1.0,
    maxHops: 2,
    maxSplits: 2,
    enableV2: false,
    enableV3: true,
  });

  const swapAmount = "0.1"; // Try with 0.1 MANTLE first
  logger.info(`Getting quote for ${swapAmount} MANTLE → USDC`);

  const quote = await quoter.getQuote(
    baseMantleTestnetTokens.wnative,
    baseMantleTestnetTokens.usdc,
    swapAmount,
    TradeType.EXACT_INPUT,
    false
  );

  if (!quote || !quote.rawTrade) {
    logger.error("No quote available");
    return;
  }

  logger.success(`Quote: ${swapAmount} MANTLE → ${quote.outputAmount} USDC`);

  const trade = quote.rawTrade;
  const methodParameters = SwapRouter.swapCallParameters(trade, {
    slippageTolerance: new Percent(100, 10000),
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    recipient: account.address,
  });

  // Set native value - this is the key part
  const nativeValue = parseUnits(swapAmount, 18);

  logger.info("Transaction details:");
  logger.info(`To: ${contracts.SMART_ROUTER}`);
  logger.info(`Value (wei): ${nativeValue.toString()}`);
  logger.info(`Value (MANTLE): ${formatEther(nativeValue)}`);

  try {
    // Method 1: Using string value
    logger.info("Attempting swap with string value...");
    const tx1 = await walletClient.sendTransaction({
      to: contracts.SMART_ROUTER as Address,
      data: methodParameters.calldata as Hex,
      value: nativeValue, // Pass BigInt directly
    });

    logger.success(`Transaction sent: ${tx1}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx1 });

    if (receipt.status === "success") {
      logger.success(`✅ Swap successful! Gas used: ${receipt.gasUsed}`);
    } else {
      logger.error("❌ Swap failed");
    }
  } catch (error: any) {
    logger.error("Transaction failed:", error?.shortMessage || error?.message);

    // Try with explicit gas limit
    logger.info("Retrying with explicit gas limit...");
    try {
      const tx2 = await walletClient.sendTransaction({
        to: contracts.SMART_ROUTER as Address,
        data: methodParameters.calldata as Hex,
        value: nativeValue,
        gas: 200000n, // Lower gas limit
      });

      logger.success(`Transaction sent: ${tx2}`);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx2,
      });

      if (receipt.status === "success") {
        logger.success(`✅ Swap successful! Gas used: ${receipt.gasUsed}`);
      } else {
        logger.error("❌ Swap failed");
      }
    } catch (error2: any) {
      logger.error(
        "Second attempt failed:",
        error2?.shortMessage || error2?.message
      );
    }
  }
}

testSimpleSwap().catch((error) => {
  logger.error("Test failed:", error?.message || error);
  process.exit(1);
});
