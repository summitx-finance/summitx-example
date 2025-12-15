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
import { mantleMainnet, mantleMainnetTokens } from "./config/mantle-mainnet";
import { TokenQuoter } from "./quoter/token-quoter-mainnet";
import { logger } from "./utils/logger";
import {
  approveTokenWithWait,
  delay,
  waitForTransaction,
} from "./utils/transaction-helpers";

config();

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

async function main() {
  logger.header("🔄 ERC20 to Native Swap Example");
  logger.info("Swapping USDC to MANTLE (native) - includes automatic unwrap");
  logger.divider();

  const contracts = getContractsForChain(ChainId.MANTLE);

  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

  const publicClient = createPublicClient({
    chain: mantleMainnet,
    transport: http(mantleMainnet.rpcUrls.default.http[0]),
  });

  const walletClient = createWalletClient({
    account,
    chain: mantleMainnet,
    transport: http(mantleMainnet.rpcUrls.default.http[0]),
  });

  logger.info(`Wallet address: ${account.address}`);

  // Define tokens to use throughout the file
  const INPUT_TOKEN = mantleMainnetTokens.usdc;
  const OUTPUT_TOKEN = mantleMainnetTokens.wnative; // WMANTLE for native swaps

  // Check input token balance
  const inputBalance = await publicClient.readContract({
    address: INPUT_TOKEN.address as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  logger.info(
    `${INPUT_TOKEN.symbol} Balance: ${formatUnits(
      inputBalance,
      INPUT_TOKEN.decimals
    )}`
  );

  if (inputBalance < parseUnits("0.5", INPUT_TOKEN.decimals)) {
    logger.error(
      `Insufficient ${INPUT_TOKEN.symbol} balance. Need at least 0.5 ${INPUT_TOKEN.symbol}`
    );
    process.exit(1);
  }

  // Initialize quoter
  const quoter = new TokenQuoter({
    rpcUrl: mantleMainnet.rpcUrls.default.http[0],
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
    const swapAmount = "0.5"; // 0.5 of input token

    logger.info(
      `Getting quote for ${swapAmount} ${INPUT_TOKEN.symbol} → MANTLE...`
    );

    // Get quote - first get to WMANTLE, then we'll unwrap
    const quote = await quoter.getQuote(
      INPUT_TOKEN,
      OUTPUT_TOKEN,
      swapAmount,
      TradeType.EXACT_INPUT,
      false
    );

    if (!quote || !quote.rawTrade) {
      logger.error(`No route found for ${INPUT_TOKEN.symbol} → MANTLE`);
      process.exit(1);
    }

    logger.success("Quote received:", {
      input: `${swapAmount} ${INPUT_TOKEN.symbol}`,
      output: `${quote.outputAmount} MANTLE`,
      priceImpact: quote.priceImpact,
      route: quote.route,
    });

    // Check initial native balance
    const initialNativeBalance = await publicClient.getBalance({
      address: account.address,
    });
    logger.info(
      `Initial MANTLE balance: ${formatUnits(
        initialNativeBalance,
        mantleMainnet.nativeCurrency.decimals
      )}`
    );

    // Approve input token with waiting period
    await approveTokenWithWait(
      walletClient,
      publicClient,
      INPUT_TOKEN.address as Address,
      contracts.SMART_ROUTER as Address,
      parseUnits(swapAmount, INPUT_TOKEN.decimals),
      INPUT_TOKEN.symbol,
      3000 // 3 second wait after approval
    );

    // Generate swap parameters
    const trade = quote.rawTrade;
    const methodParameters = SwapRouter.swapCallParameters(trade, {
      slippageTolerance: new Percent(100, 10000), // 1%
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      recipient: account.address,
    });

    // Add unwrap to get native MANTLE
    // The router needs to swap to WMANTLE and then unwrap to native
    logger.info("Executing swap with automatic unwrap to native MANTLE...");

    // Check if WMANTLE balance before (for debugging)
    const wnativeBalanceBefore = await publicClient.readContract({
      address: OUTPUT_TOKEN.address as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    logger.info(
      `WMANTLE balance before: ${formatUnits(
        wnativeBalanceBefore,
        OUTPUT_TOKEN.decimals
      )}`
    );

    const swapHash = await walletClient.sendTransaction({
      to: contracts.SMART_ROUTER as Address,
      data: methodParameters.calldata,
      value: 0n, // No native value for ERC20 swaps
    });

    logger.info(`Transaction sent: ${swapHash}`);

    await waitForTransaction(publicClient, swapHash, "swap transaction");

    // Add small delay after swap to ensure state is updated
    await delay(2000, "⏳ Waiting for blockchain state to update...");

    // Check balances after swap
    const [wnativeBalanceAfter, finalUsdcBalance] = await Promise.all([
      publicClient.readContract({
        address: OUTPUT_TOKEN.address as Address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account.address],
      }),
      publicClient.readContract({
        address: INPUT_TOKEN.address as Address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account.address],
      }),
    ]);

    logger.info(
      `WMANTLE balance after swap: ${formatUnits(
        wnativeBalanceAfter,
        OUTPUT_TOKEN.decimals
      )}`
    );
    const wnativeReceived = wnativeBalanceAfter - wnativeBalanceBefore;

    if (wnativeReceived > 0n) {
      // We received WMANTLE, need to unwrap it to native MANTLE
      logger.info(
        `Received ${formatUnits(
          wnativeReceived,
          OUTPUT_TOKEN.decimals
        )} WMANTLE, unwrapping to native MANTLE...`
      );

      // Unwrap WMANTLE to native MANTLE
      const WETH_ABI = [
        {
          name: "withdraw",
          type: "function",
          inputs: [{ name: "wad", type: "uint256" }],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ] as const;

      const unwrapHash = await walletClient.writeContract({
        address: OUTPUT_TOKEN.address as Address,
        abi: WETH_ABI,
        functionName: "withdraw",
        args: [wnativeReceived],
      });

      logger.info(`Unwrap transaction sent: ${unwrapHash}`);
      const unwrapReceipt = await publicClient.waitForTransactionReceipt({
        hash: unwrapHash,
      });

      if (unwrapReceipt.status === "success") {
        logger.success("✅ Unwrap successful!");
      }
    }

    // Check final native balance
    const finalNativeBalance = await publicClient.getBalance({
      address: account.address,
    });
    const nativeReceived =
      finalNativeBalance -
      initialNativeBalance +
      receipt.gasUsed * receipt.effectiveGasPrice;

    logger.success("Balance changes:", {
      [INPUT_TOKEN.symbol]: `${formatUnits(
        inputBalance,
        INPUT_TOKEN.decimals
      )} → ${formatUnits(finalUsdcBalance, INPUT_TOKEN.decimals)}`,
      "Native MANTLE": `${formatUnits(
        initialNativeBalance,
        mantleMainnet.nativeCurrency.decimals
      )} → ${formatUnits(
        finalNativeBalance,
        mantleMainnet.nativeCurrency.decimals
      )}`,
      "Approx MANTLE received": formatUnits(
        nativeReceived,
        mantleMainnet.nativeCurrency.decimals
      ),
    });
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
