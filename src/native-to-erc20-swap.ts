import { ChainId } from "@fusionx-finance/sdk";
import { SwapRouter } from "@fusionx-finance/smart-router/evm";
import { Percent, TradeType } from "@fusionx-finance/swap-sdk-core";
import { config } from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getContractsForChain } from "./config/chains";
import {
  baseMantleTestnetTokens,
  mantleSepoliaTestnet,
} from "./config/mantle-testnet";
import { TokenQuoter } from "./quoter/token-quoter";
import { logger } from "./utils/logger";

config();

async function delay(ms: number) {
  logger.info(`⏳ Waiting ${ms / 1000} seconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  logger.header("🔄 Native to ERC20 Swap Example");
  logger.info("Swapping MANTLE (native) to USDC");
  logger.divider();

  const contracts = getContractsForChain(ChainId.MANTLE_SEPOLIA_TESTNET);

  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

  const publicClient = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http(mantleSepoliaTestnet.rpcUrls.default.http[0]),
  });

  const walletClient = createWalletClient({
    account,
    chain: mantleSepoliaTestnet,
    transport: http(mantleSepoliaTestnet.rpcUrls.default.http[0]),
  });

  logger.info(`Wallet address: ${account.address}`);

  // Define tokens to use throughout the file
  const INPUT_TOKEN = baseMantleTestnetTokens.wnative; // WMANTLE for native swaps
  const OUTPUT_TOKEN = baseMantleTestnetTokens.usdc;

  // Check native balance
  const nativeBalance = await publicClient.getBalance({
    address: account.address,
  });
  logger.info(
    `Native MANTLE balance: ${formatUnits(
      nativeBalance,
      mantleSepoliaTestnet.nativeCurrency.decimals
    )}`
  );

  if (
    nativeBalance <
    parseUnits("0.1", mantleSepoliaTestnet.nativeCurrency.decimals)
  ) {
    logger.error("Insufficient MANTLE balance. Need at least 0.1 MANTLE");
    process.exit(1);
  }

  // Initialize quoter
  const quoter = new TokenQuoter({
    rpcUrl: mantleSepoliaTestnet.rpcUrls.default.http[0],
    slippageTolerance: 1.0,
    maxHops: 2,
    maxSplits: 2,
    enableV2: false,
    enableV3: true,
  });

  try {
    // Add initial delay
    await delay(2000);

    // Define swap amount
    const swapAmount = "0.01"; // 0.01 MANTLE

    logger.info(
      `Getting quote for ${swapAmount} MANTLE → ${OUTPUT_TOKEN.symbol}...`
    );

    // Get quote
    const quote = await quoter.getQuote(
      INPUT_TOKEN, // Use WMANTLE for native
      OUTPUT_TOKEN,
      swapAmount,
      TradeType.EXACT_INPUT,
      false
    );

    if (!quote || !quote.rawTrade) {
      logger.error(`No route found for MANTLE → ${OUTPUT_TOKEN.symbol}`);
      process.exit(1);
    }

    logger.success("Quote received:", {
      input: `${swapAmount} MANTLE`,
      output: `${quote.outputAmount} ${OUTPUT_TOKEN.symbol}`,
      priceImpact: quote.priceImpact,
      route: quote.route,
    });

    // Generate swap parameters
    const trade = quote.rawTrade;
    const methodParameters = SwapRouter.swapCallParameters(trade, {
      slippageTolerance: new Percent(100, 10000), // 1%
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      recipient: account.address,
    });

    // For native token swap, set the value
    const nativeValue = parseUnits(
      swapAmount,
      mantleSepoliaTestnet.nativeCurrency.decimals
    );

    logger.info(
      `Sending ${formatUnits(
        nativeValue,
        mantleSepoliaTestnet.nativeCurrency.decimals
      )} MANTLE with transaction`
    );

    // Execute swap
    logger.info("Executing swap...");

    const swapHash = await walletClient.sendTransaction({
      to: contracts.SMART_ROUTER as Address,
      data: methodParameters.calldata,
      value: nativeValue, // Send native MANTLE
    });

    logger.info(`Transaction sent: ${swapHash}`);

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: swapHash,
    });

    if (receipt.status === "success") {
      logger.success(`✅ Swap successful! Gas used: ${receipt.gasUsed}`);

      // Check output token balance
      const outputBalance = await publicClient.readContract({
        address: OUTPUT_TOKEN.address as Address,
        abi: [
          {
            name: "balanceOf",
            type: "function",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
          },
        ] as const,
        functionName: "balanceOf",
        args: [account.address],
      });

      logger.success(
        `New ${OUTPUT_TOKEN.symbol} balance:`,
        formatUnits(outputBalance, OUTPUT_TOKEN.decimals)
      );
    } else {
      logger.error("❌ Swap failed");
    }
  } catch (error: any) {
    if (error?.message?.includes("429")) {
      logger.error("⚠️ Rate limited - try again later");
    } else {
      logger.error(
        "Error:",
        error?.shortMessage || error?.message || "Unknown error"
      );
    }
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error?.message || error);
  process.exit(1);
});
