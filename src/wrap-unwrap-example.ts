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
import { megaethTestnet } from "./config/megaeth-testnet";
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
  const contracts = getContractsForChain(ChainId.MEGAETH_TESTNET);

  logger.header("Wrap/Unwrap Example - MegaETH Testnet");
  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const privateKey = process.env.PRIVATE_KEY.startsWith("0x")
    ? process.env.PRIVATE_KEY
    : `0x${process.env.PRIVATE_KEY}`;
  const account = privateKeyToAccount(privateKey as Hex);

  const publicClient = createPublicClient({
    chain: megaethTestnet,
    transport: http(megaethTestnet.rpcUrls.default.http[0]),
  });

  const walletClient = createWalletClient({
    account,
    chain: megaethTestnet,
    transport: http(megaethTestnet.rpcUrls.default.http[0]),
  });

  logger.info(`Wallet address: ${account.address}`);

  try {
    const nativeBalance = await publicClient.getBalance({
      address: account.address,
    });

    const wethBalance = await publicClient.readContract({
      address: contracts.WETH as Address,
      abi: WETH_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });

    logger.info("Current balances:", {
      nativeETH: formatUnits(nativeBalance, 18),
      wrappedETH: formatUnits(wethBalance, 18),
    });

    logger.header("1. Wrapping Native ETH to WETH");

    const wrapAmount = parseUnits("0.01", 18);
    logger.info(`Wrapping ${formatUnits(wrapAmount, 18)} ETH...`);

    const wrapHash = await walletClient.writeContract({
      address: contracts.WETH as Address,
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

    const newWethBalance = await publicClient.readContract({
      address: contracts.WETH as Address,
      abi: WETH_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });

    logger.info(`New WETH balance: ${formatUnits(newWethBalance, 18)}`);

    logger.header("2. Unwrapping WETH to Native ETH");

    const unwrapAmount = parseUnits("0.005", 18);

    if (newWethBalance >= unwrapAmount) {
      logger.info(`Unwrapping ${formatUnits(unwrapAmount, 18)} WETH...`);

      const unwrapHash = await walletClient.writeContract({
        address: contracts.WETH as Address,
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

      const finalWethBalance = await publicClient.readContract({
        address: contracts.WETH as Address,
        abi: WETH_ABI,
        functionName: "balanceOf",
        args: [account.address],
      });

      logger.success("Final balances:", {
        nativeETH: formatUnits(finalNativeBalance, 18),
        wrappedETH: formatUnits(finalWethBalance, 18),
      });
    } else {
      logger.warn("Insufficient WETH balance for unwrapping");
    }

    logger.header("3. Advanced: Batch Wrap Operations");

    const batchWrapAmounts = [
      parseUnits("0.001", 18),
      parseUnits("0.002", 18),
      parseUnits("0.003", 18),
    ];

    logger.info("Executing batch wrap operations...");

    for (let i = 0; i < batchWrapAmounts.length; i++) {
      const amount = batchWrapAmounts[i];
      logger.info(`Batch wrap ${i + 1}: ${formatUnits(amount, 18)} ETH`);

      const hash = await walletClient.writeContract({
        address: contracts.WETH as Address,
        abi: WETH_ABI,
        functionName: "deposit",
        value: amount,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      logger.success(`✅ Batch wrap ${i + 1} completed`);
    }

    const finalBatchWethBalance = await publicClient.readContract({
      address: contracts.WETH as Address,
      abi: WETH_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });

    logger.success(
      `Total WETH after batch: ${formatUnits(finalBatchWethBalance, 18)}`
    );

    logger.header("4. Reading WETH Contract State");

    const totalSupply = await publicClient.readContract({
      address: contracts.WETH as Address,
      abi: WETH_ABI,
      functionName: "totalSupply",
    });

    logger.info("WETH Total Supply:", formatUnits(totalSupply, 18));

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
