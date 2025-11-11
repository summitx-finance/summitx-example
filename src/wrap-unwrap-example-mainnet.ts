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
import {
  campMainnet,
  campMainnetTokens,
} from "./config/camp-mainnet";
import { getContractsForChain } from "./config/chains";
import { ChainId } from "@summitx/chains";
import { logger } from "./utils/logger";

config();

const WETH_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "totalSupply",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

async function main() {
  const contracts = getContractsForChain(ChainId.BASECAMP);

  logger.header("Wrap/Unwrap Example - Base Camp Testnet");

  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

  const publicClient = createPublicClient({
    chain: campMainnet,
    transport: http(campMainnet.rpcUrls.default.http[0]),
  });

  const walletClient = createWalletClient({
    account,
    chain: campMainnet,
    transport: http(campMainnet.rpcUrls.default.http[0]),
  });

  logger.info(`Wallet address: ${account.address}`);

  // Define token to use throughout the file
  const WRAPPED_TOKEN = campMainnetTokens.wcamp;
  const NATIVE_DECIMALS = campMainnet.nativeCurrency.decimals;

  try {
    const nativeBalance = await publicClient.getBalance({
      address: account.address,
    });

    const wrappedBalance = await publicClient.readContract({
      address: contracts.WCAMP as Address,
      abi: WETH_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });

    logger.info("Current balances:", {
      nativeCAMP: formatUnits(
        nativeBalance,
        NATIVE_DECIMALS
      ),
      wrappedCAMP: formatUnits(wrappedBalance, WRAPPED_TOKEN.decimals),
    });

    logger.header("1. Wrapping Native CAMP to WCAMP");

    const wrapAmount = parseUnits("0.01", NATIVE_DECIMALS);
    logger.info(
      `Wrapping ${formatUnits(
        wrapAmount,
        NATIVE_DECIMALS
      )} CAMP...`
    );

    const wrapHash = await walletClient.writeContract({
      address: contracts.WCAMP as Address,
      abi: WETH_ABI,
      functionName: "deposit",
      value: wrapAmount,
    });

    logger.info(`Wrap transaction sent: ${wrapHash}`);

    const wrapReceipt = await publicClient.waitForTransactionReceipt({
      hash: wrapHash,
    });

    logger.success(
      `✅ Wrap successful! Gas used: ${wrapReceipt.gasUsed.toString()}`
    );

    const newWrappedBalance = await publicClient.readContract({
      address: contracts.WCAMP as Address,
      abi: WETH_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });

    logger.info(
      `New ${WRAPPED_TOKEN.symbol} balance: ${formatUnits(
        newWrappedBalance,
        WRAPPED_TOKEN.decimals
      )}`
    );

    logger.header("2. Unwrapping WCAMP to Native CAMP");

    const unwrapAmount = parseUnits("0.005", WRAPPED_TOKEN.decimals);

    if (newWrappedBalance >= unwrapAmount) {
      logger.info(
        `Unwrapping ${formatUnits(
          unwrapAmount,
          WRAPPED_TOKEN.decimals
        )} ${WRAPPED_TOKEN.symbol}...`
      );

      const unwrapHash = await walletClient.writeContract({
        address: contracts.WCAMP as Address,
        abi: WETH_ABI,
        functionName: "withdraw",
        args: [unwrapAmount],
      });

      logger.info(`Unwrap transaction sent: ${unwrapHash}`);

      const unwrapReceipt = await publicClient.waitForTransactionReceipt({
        hash: unwrapHash,
      });

      logger.success(
        `✅ Unwrap successful! Gas used: ${unwrapReceipt.gasUsed.toString()}`
      );

      const finalNativeBalance = await publicClient.getBalance({
        address: account.address,
      });

      const finalWrappedBalance = await publicClient.readContract({
        address: contracts.WCAMP as Address,
        abi: WETH_ABI,
        functionName: "balanceOf",
        args: [account.address],
      });

      logger.success("Final balances:", {
        nativeCAMP: formatUnits(
          finalNativeBalance,
          NATIVE_DECIMALS
        ),
        wrappedCAMP: formatUnits(
          finalWrappedBalance,
          WRAPPED_TOKEN.decimals
        ),
      });
    } else {
      logger.warn(`Insufficient ${WRAPPED_TOKEN.symbol} balance for unwrapping`);
    }

    logger.header("3. Advanced: Batch Wrap Operations");

    const batchWrapAmounts = [
      parseUnits("0.001", NATIVE_DECIMALS),
      parseUnits("0.002", NATIVE_DECIMALS),
      parseUnits("0.003", NATIVE_DECIMALS),
    ];

    logger.info("Executing batch wrap operations...");

    for (let i = 0; i < batchWrapAmounts.length; i++) {
      const amount = batchWrapAmounts[i];
      logger.info(
        `Batch wrap ${i + 1}: ${formatUnits(
          amount,
          NATIVE_DECIMALS
        )} CAMP`
      );

      const hash = await walletClient.writeContract({
        address: contracts.WCAMP as Address,
        abi: WETH_ABI,
        functionName: "deposit",
        value: amount,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      logger.success(`✅ Batch wrap ${i + 1} completed`);
    }

    const finalBatchWrappedBalance = await publicClient.readContract({
      address: contracts.WCAMP as Address,
      abi: WETH_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });

    logger.success(
      `Total ${WRAPPED_TOKEN.symbol} after batch: ${formatUnits(
        finalBatchWrappedBalance,
        WRAPPED_TOKEN.decimals
      )}`
    );

    logger.header("4. Reading WETH Contract State");

    const totalSupply = await publicClient.readContract({
      address: contracts.WCAMP as Address,
      abi: WETH_ABI,
      functionName: "totalSupply",
    });

    logger.info(
      `${WRAPPED_TOKEN.symbol} Total Supply:`,
      formatUnits(totalSupply, WRAPPED_TOKEN.decimals)
    );

    logger.success("🎉 Wrap/Unwrap example completed successfully!");
  } catch (error: any) {
    // Handle rate limiting errors with cleaner output
    if (
      error?.message?.includes("429") ||
      error?.message?.includes("Too Many Requests")
    ) {
      logger.error("⚠️ Rate Limited: Too many requests to RPC endpoint");
      logger.info("💡 Try again in a few seconds");
    } else if (error?.shortMessage) {
      logger.error("Error:", error.shortMessage);
    } else {
      logger.error("Error:", error?.message || "Unknown error occurred");
    }
    process.exit(1);
  }
}

main().catch((error: any) => {
  if (error?.message?.includes("429")) {
    logger.error("⚠️ Rate limited - try again later");
  } else {
    logger.error("Failed to run wrap/unwrap example:", error?.message || error);
  }
  process.exit(1);
});
