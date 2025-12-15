import { ChainId } from "@fusionx-finance/sdk";
import { SwapRouter } from "@fusionx-finance/smart-router/evm";
import { Percent, TradeType } from "@fusionx-finance/swap-sdk-core";
import { config } from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  formatUnits,
  http,
  parseUnits,
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

async function debugGas() {
  logger.header("🔍 Debug Gas Estimation");

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

  // Get current balance
  const balance = await publicClient.getBalance({ address: account.address });
  logger.info(`Current balance: ${formatEther(balance)} MANTLE`);

  // Get gas price
  const gasPrice = await publicClient.getGasPrice();
  logger.info(`Current gas price: ${formatUnits(gasPrice, 9)} Gwei`);

  // Get a quote for 1 MANTLE swap
  const quoter = new TokenQuoter({
    rpcUrl: "https://rpc.sepolia.mantle.xyz",
    slippageTolerance: 1.0,
    maxHops: 2,
    maxSplits: 2,
    enableV2: false,
    enableV3: true,
  });

  const swapAmount = "1"; // 1 MANTLE
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

  // Set native value
  const swapValue = parseUnits(swapAmount, 18);
  methodParameters.value = swapValue.toString();

  logger.divider();
  logger.info("Transaction parameters:");
  logger.info(`To: ${contracts.SMART_ROUTER}`);
  logger.info(`Value: ${formatEther(BigInt(methodParameters.value))} MANTLE`);
  logger.info(`Data length: ${methodParameters.calldata.length} bytes`);

  // Estimate gas
  try {
    const estimatedGas = await publicClient.estimateGas({
      account: account.address,
      to: contracts.SMART_ROUTER as `0x${string}`,
      data: methodParameters.calldata as `0x${string}`,
      value: BigInt(methodParameters.value),
    });

    logger.success(`Estimated gas: ${estimatedGas.toString()} units`);

    // Calculate total cost
    const gasCost = estimatedGas * gasPrice;
    const totalCost = gasCost + BigInt(methodParameters.value);

    logger.divider();
    logger.info("Cost breakdown:");
    logger.info(`Gas cost: ${formatEther(gasCost)} MANTLE`);
    logger.info(
      `Swap value: ${formatEther(BigInt(methodParameters.value))} MANTLE`
    );
    logger.info(`Total cost: ${formatEther(totalCost)} MANTLE`);

    // Check if balance is sufficient
    if (balance >= totalCost) {
      logger.success(
        `✅ Balance sufficient: ${formatEther(balance)} >= ${formatEther(
          totalCost
        )}`
      );
    } else {
      logger.error(
        `❌ Insufficient balance: ${formatEther(balance)} < ${formatEther(
          totalCost
        )}`
      );
    }

    // Try with hardcoded gas limit
    const hardcodedGas = 500000n;
    const hardcodedCost =
      hardcodedGas * gasPrice + BigInt(methodParameters.value);
    logger.divider();
    logger.info("With hardcoded gas (500000):");
    logger.info(`Total cost: ${formatEther(hardcodedCost)} MANTLE`);

    if (balance >= hardcodedCost) {
      logger.success(`✅ Balance sufficient with hardcoded gas`);
    } else {
      logger.error(`❌ Still insufficient with hardcoded gas`);
    }
  } catch (error: any) {
    logger.error("Gas estimation failed:", error?.message || error);

    if (error?.message?.includes("exceeds the balance")) {
      logger.info(
        "This error occurs during gas estimation, not actual execution"
      );
      logger.info("The contract might be reverting due to the swap value");
    }
  }
}

debugGas().catch((error) => {
  logger.error("Debug failed:", error?.message || error);
  process.exit(1);
});
