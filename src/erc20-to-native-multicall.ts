import { ChainId } from "@fusionx-finance/sdk";
import { SwapRouter } from "@fusionx-finance/smart-router/evm";
import { Percent, TradeType } from "@fusionx-finance/swap-sdk-core";
import { config } from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
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

const WETH_ABI = [
  {
    name: "withdraw",
    type: "function",
    inputs: [{ name: "wad", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// SwapRouter02 multicall ABI
const ROUTER_MULTICALL_ABI = [
  {
    name: "multicall",
    type: "function",
    inputs: [
      {
        name: "data",
        type: "bytes[]",
      },
    ],
    outputs: [
      {
        name: "results",
        type: "bytes[]",
      },
    ],
    stateMutability: "payable",
  },
  {
    name: "unwrapWETH9",
    type: "function",
    inputs: [
      { name: "amountMinimum", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    name: "sweepToken",
    type: "function",
    inputs: [
      { name: "token", type: "address" },
      { name: "amountMinimum", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

async function main() {
  logger.header("🔄 ERC20 to Native Swap with Multicall");
  logger.info("Swapping USDC to MANTLE (native) in a single transaction");
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
  const INPUT_TOKEN = baseMantleTestnetTokens.usdc;
  const OUTPUT_TOKEN = baseMantleTestnetTokens.wnative; // WMANTLE for native swaps

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
    rpcUrl: mantleSepoliaTestnet.rpcUrls.default.http[0],
    slippageTolerance: 1.0,
    maxHops: 2,
    maxSplits: 3,
    enableV2: true,
    enableV3: true,
  });

  try {
    // Add initial delay
    await delay(2000);

    // Define swap amount
    const swapAmount = "0.5"; // 0.5 of input token

    logger.info(`Getting quote for ${swapAmount} USDC → MANTLE...`);

    // Get quote - swap to WMANTLE first
    const quote = await quoter.getQuote(
      INPUT_TOKEN,
      OUTPUT_TOKEN,
      swapAmount,
      TradeType.EXACT_INPUT,
      false
    );

    if (!quote || !quote.rawTrade) {
      logger.error(`No route found for ${INPUT_TOKEN.symbol} → WMANTLE`);
      process.exit(1);
    }

    logger.success("Quote received:", {
      input: `${swapAmount} ${INPUT_TOKEN.symbol}`,
      output: `${quote.outputAmount} WMANTLE`,
      priceImpact: quote.priceImpact,
      route: quote.route,
    });

    // Check initial balances
    const [initialNativeBalance, wnativeBalanceBefore] = await Promise.all([
      publicClient.getBalance({ address: account.address }),
      publicClient.readContract({
        address: contracts.WMANTLE as Address,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [account.address],
      }),
    ]);

    logger.info(
      `Initial MANTLE balance: ${formatUnits(
        initialNativeBalance,
        mantleSepoliaTestnet.nativeCurrency.decimals
      )}`
    );
    logger.info(
      `Initial WMANTLE balance: ${formatUnits(
        wnativeBalanceBefore,
        OUTPUT_TOKEN.decimals
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

    // Generate swap parameters - swap to router first to handle the unwrap
    const trade = quote.rawTrade;
    const swapParams = SwapRouter.swapCallParameters(trade, {
      slippageTolerance: new Percent(100, 10000), // 1%
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      recipient: contracts.SMART_ROUTER as Address, // Send WMANTLE to router for unwrapping
    });

    // Calculate minimum amount out with slippage
    const minAmountOut = BigInt(
      Math.floor(parseFloat(quote.outputAmount) * 0.99 * 1e18).toString()
    );

    // Create multicall data
    const multicallData = [
      // First: Execute the swap (USDC -> WMANTLE to router)
      swapParams.calldata,
      // Second: Unwrap WMANTLE to native MANTLE and send to user
      encodeFunctionData({
        abi: ROUTER_MULTICALL_ABI,
        functionName: "unwrapWETH9",
        args: [minAmountOut, account.address],
      }),
    ];

    logger.info("Executing multicall swap + unwrap in single transaction...");

    // Execute multicall
    const txHash = await walletClient.writeContract({
      address: contracts.SMART_ROUTER as Address,
      abi: ROUTER_MULTICALL_ABI,
      functionName: "multicall",
      args: [multicallData],
      value: 0n, // No native value needed for ERC20 swaps
    });

    logger.info(`Transaction sent: ${txHash}`);

    await waitForTransaction(publicClient, txHash, "multicall swap + unwrap");

    // Add small delay after swap to ensure state is updated
    await delay(2000, "⏳ Waiting for blockchain state to update...");

    // Check final balances
    const [finalNativeBalance, wnativeBalanceAfter, finalUsdcBalance] =
      await Promise.all([
        publicClient.getBalance({ address: account.address }),
        publicClient.readContract({
          address: contracts.WMANTLE as Address,
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

    // Calculate net native received
    const nativeReceived = finalNativeBalance - initialNativeBalance;

    logger.success("Balance changes:", {
      [INPUT_TOKEN.symbol]: `${formatUnits(
        inputBalance,
        INPUT_TOKEN.decimals
      )} → ${formatUnits(finalUsdcBalance, INPUT_TOKEN.decimals)}`,
      WMANTLE: `${formatUnits(
        wnativeBalanceBefore,
        OUTPUT_TOKEN.decimals
      )} → ${formatUnits(wnativeBalanceAfter, OUTPUT_TOKEN.decimals)}`,
      "Native MANTLE": `${formatUnits(
        initialNativeBalance,
        mantleSepoliaTestnet.nativeCurrency.decimals
      )} → ${formatUnits(
        finalNativeBalance,
        mantleSepoliaTestnet.nativeCurrency.decimals
      )}`,
      "MANTLE received (net)": formatUnits(
        nativeReceived,
        mantleSepoliaTestnet.nativeCurrency.decimals
      ),
    });

    logger.success(
      "✅ Successfully swapped USDC to native MANTLE in a single transaction!"
    );
  } catch (error: any) {
    if (error?.message?.includes("429")) {
      logger.error("⚠️ Rate limited - try again later");
    } else if (error?.message?.includes("unwrapWETH9")) {
      logger.error(
        "⚠️ Router doesn't support unwrapWETH9 - trying alternative approach"
      );
      // Fall back to alternative approach if needed
    } else {
      logger.error(
        "Error:",
        error?.shortMessage || error?.message || "Unknown error"
      );
      console.error("Full error:", error);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error?.message || error);
  process.exit(1);
});
