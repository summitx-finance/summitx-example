import { ChainId } from "@fusionx-finance/sdk";
import {
  SwapRouter,
  type MethodParameters,
} from "@fusionx-finance/smart-router/evm";
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

const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    name: "allowance",
    type: "function",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

async function checkAndApproveToken(
  walletClient: any,
  publicClient: any,
  tokenAddress: Address,
  amount: bigint,
  walletAddress: Address
) {
  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [walletAddress, contracts.SMART_ROUTER],
  });

  if (allowance < amount) {
    logger.info(
      `Approving ${formatUnits(
        amount,
        mantleSepoliaTestnet.nativeCurrency.decimals
      )} tokens...`
    );
    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [contracts.SMART_ROUTER, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    logger.success("✅ Token approved");
  }
}

async function getBalances(publicClient: any, address: Address) {
  // Define tokens for balance checking
  const BALANCE_TOKENS = {
    usdc: baseMantleTestnetTokens.usdc,
    usdt: baseMantleTestnetTokens.usdt,
    weth: baseMantleTestnetTokens.weth,
    wbtc: baseMantleTestnetTokens.wbtc,
    dai: baseMantleTestnetTokens.dai,
  };

  const [
    nativeBalance,
    usdcBalance,
    usdtBalance,
    wethBalance,
    wbtcBalance,
    daiBalance,
  ] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({
      address: BALANCE_TOKENS.usdc.address as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }),
    publicClient.readContract({
      address: BALANCE_TOKENS.usdt.address as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }),
    publicClient.readContract({
      address: BALANCE_TOKENS.weth.address as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }),
    publicClient.readContract({
      address: BALANCE_TOKENS.wbtc.address as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }),
    publicClient.readContract({
      address: BALANCE_TOKENS.dai.address as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }),
  ]);

  return {
    native: formatUnits(
      nativeBalance,
      mantleSepoliaTestnet.nativeCurrency.decimals
    ),
    usdc: formatUnits(usdcBalance, BALANCE_TOKENS.usdc.decimals),
    usdt: formatUnits(usdtBalance, BALANCE_TOKENS.usdt.decimals),
    weth: formatUnits(wethBalance, BALANCE_TOKENS.weth.decimals),
    wbtc: formatUnits(wbtcBalance, BALANCE_TOKENS.wbtc.decimals),
    dai: formatUnits(daiBalance, BALANCE_TOKENS.dai.decimals),
  };
}

async function executeSwap(
  walletClient: any,
  publicClient: any,
  methodParameters: MethodParameters,
  swapType: string
) {
  logger.info(`Executing ${swapType} swap...`);

  // Log the value being sent for debugging
  if (methodParameters.value && methodParameters.value !== "0x00") {
    logger.info(
      `Sending ${formatUnits(
        BigInt(methodParameters.value),
        mantleSepoliaTestnet.nativeCurrency.decimals
      )} MANTLE with transaction`
    );
  }

  const hash = await walletClient.sendTransaction({
    to: contracts.SMART_ROUTER as Address, // Use the router address directly
    data: methodParameters.calldata,
    value: BigInt(methodParameters.value || 0),
    // Don't specify gas, let viem estimate it
  });

  logger.info(`Transaction sent: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === "success") {
    logger.success(
      `✅ ${swapType} swap successful! Gas used: ${receipt.gasUsed}`
    );
  } else {
    logger.error(`❌ ${swapType} swap failed`);
  }

  return receipt;
}

async function delay(ms: number) {
  logger.info(`⏳ Waiting ${ms / 1000} seconds before next transaction...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  logger.header("🔄 Comprehensive Swap Examples - Base Mantle Testnet");

  const contracts = getContractsForChain(ChainId.MANTLE_SEPOLIA_TESTNET);

  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

  const publicClient = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http(
      process.env.MANTLE_TESTNET_RPC_URL || "https://rpc.sepolia.mantle.xyz"
    ),
  });

  const walletClient = createWalletClient({
    account,
    chain: mantleSepoliaTestnet,
    transport: http(
      process.env.MANTLE_TESTNET_RPC_URL || "https://rpc.sepolia.mantle.xyz"
    ),
  });

  const quoter = new TokenQuoter({
    rpcUrl:
      process.env.MANTLE_TESTNET_RPC_URL || "https://rpc.sepolia.mantle.xyz",
    slippageTolerance: 0.5,
    maxHops: 3,
    maxSplits: 3,
    enableV2: false, // Disable V2 due to chain ID issues
    enableV3: true,
  });

  // Converter is a static class, no need to instantiate

  logger.info(`Wallet address: ${account.address}`);

  const initialBalances = await getBalances(publicClient, account.address);
  logger.info("Initial balances:", initialBalances);

  try {
    // Add initial delay to avoid immediate rate limiting
    await delay(3000);

    // ============================================
    // 1. NATIVE TO ERC20 SWAP (MANTLE → USDC)
    // ============================================
    logger.header("1️⃣ Native to ERC20 Swap: MANTLE → USDC");

    // Define tokens for this swap
    const NATIVE_TO_ERC20_INPUT = baseMantleTestnetTokens.wnative; // Use WMANTLE for native
    const NATIVE_TO_ERC20_OUTPUT = baseMantleTestnetTokens.usdc;

    const nativeToErc20Amount = "1"; // 1 MANTLE
    const nativeToErc20Quote = await quoter.getQuote(
      NATIVE_TO_ERC20_INPUT,
      NATIVE_TO_ERC20_OUTPUT,
      nativeToErc20Amount, // Pass decimal string
      TradeType.EXACT_INPUT,
      false // Don't adjust for gas like execute-swap-interface-style
    );

    if (nativeToErc20Quote) {
      logger.info("Quote received:", {
        input: `${nativeToErc20Amount} MANTLE`,
        output: `${nativeToErc20Quote.outputAmount} ${NATIVE_TO_ERC20_OUTPUT.symbol}`,
        priceImpact: nativeToErc20Quote.priceImpact,
      });

      // Use rawTrade directly from the quote
      if (!nativeToErc20Quote.rawTrade) {
        logger.error("No raw trade available in quote");
        return;
      }
      const trade = nativeToErc20Quote.rawTrade;
      const methodParameters = SwapRouter.swapCallParameters(trade, {
        slippageTolerance: new Percent(50, 10000),
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        recipient: account.address,
      });

      // For native token swap, ensure value is set
      const swapValue = parseUnits(
        nativeToErc20Amount,
        mantleSepoliaTestnet.nativeCurrency.decimals
      ); // Native MANTLE has 18 decimals
      methodParameters.value = swapValue.toString();

      await executeSwap(
        walletClient,
        publicClient,
        methodParameters,
        "MANTLE → USDC"
      );
      await delay(5000); // Wait 5 seconds before next transaction
    } else {
      logger.warn("No route found for MANTLE → USDC");
    }

    // ============================================
    // 2. ERC20 TO NATIVE SWAP (USDC → MANTLE)
    // ============================================
    logger.header("2️⃣ ERC20 to Native Swap: USDC → MANTLE");

    // Define tokens for this swap
    const ERC20_TO_NATIVE_INPUT = baseMantleTestnetTokens.usdc;
    const ERC20_TO_NATIVE_OUTPUT = baseMantleTestnetTokens.wnative; // Use WMANTLE for native

    const erc20ToNativeAmount = "1"; // 1 USDC
    const erc20ToNativeQuote = await quoter.getQuote(
      ERC20_TO_NATIVE_INPUT,
      ERC20_TO_NATIVE_OUTPUT,
      erc20ToNativeAmount, // Pass decimal string
      TradeType.EXACT_INPUT,
      false // Don't adjust for gas
    );

    if (erc20ToNativeQuote) {
      logger.info("Quote received:", {
        input: `${erc20ToNativeAmount} ${ERC20_TO_NATIVE_INPUT.symbol}`,
        output: `${erc20ToNativeQuote.outputAmount} MANTLE`,
        priceImpact: erc20ToNativeQuote.priceImpact,
      });

      // Approve input token
      await checkAndApproveToken(
        walletClient,
        publicClient,
        ERC20_TO_NATIVE_INPUT.address as Address,
        parseUnits(erc20ToNativeAmount, ERC20_TO_NATIVE_INPUT.decimals),
        account.address
      );

      // Use rawTrade directly from the quote
      if (!erc20ToNativeQuote.rawTrade) {
        logger.error("No raw trade available in quote");
        return;
      }
      const trade = erc20ToNativeQuote.rawTrade;

      // For swaps to native token, we might need to handle unwrapping
      // The router should handle this automatically with the right parameters
      const methodParameters = SwapRouter.swapCallParameters(trade, {
        slippageTolerance: new Percent(50, 10000),
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        recipient: account.address,
      });

      await executeSwap(
        walletClient,
        publicClient,
        methodParameters,
        "USDC → MANTLE"
      );
      await delay(5000); // Wait 5 seconds before next transaction
    } else {
      logger.warn("No route found for USDC → MANTLE");
    }

    // ============================================
    // 3. ERC20 TO ERC20 SWAP (USDC → USDT)
    // ============================================
    logger.header("3️⃣ ERC20 to ERC20 Swap: USDC → USDT");

    // Define tokens for this swap
    const ERC20_TO_ERC20_INPUT = baseMantleTestnetTokens.usdc;
    const ERC20_TO_ERC20_OUTPUT = baseMantleTestnetTokens.usdt;

    const erc20ToErc20Amount = "1"; // 1 of input token
    const erc20ToErc20Quote = await quoter.getQuote(
      ERC20_TO_ERC20_INPUT,
      ERC20_TO_ERC20_OUTPUT,
      erc20ToErc20Amount, // Pass decimal string
      TradeType.EXACT_INPUT,
      false // Don't adjust for gas
    );

    if (erc20ToErc20Quote) {
      logger.info("Quote received:", {
        input: `${erc20ToErc20Amount} ${ERC20_TO_ERC20_INPUT.symbol}`,
        output: `${erc20ToErc20Quote.outputAmount} ${ERC20_TO_ERC20_OUTPUT.symbol}`,
        priceImpact: erc20ToErc20Quote.priceImpact,
      });

      // Approve input token
      await checkAndApproveToken(
        walletClient,
        publicClient,
        ERC20_TO_ERC20_INPUT.address as Address,
        parseUnits(erc20ToErc20Amount, ERC20_TO_ERC20_INPUT.decimals),
        account.address
      );

      // Use rawTrade directly from the quote
      if (!erc20ToErc20Quote.rawTrade) {
        logger.error("No raw trade available in quote");
        return;
      }
      const trade = erc20ToErc20Quote.rawTrade;
      const methodParameters = SwapRouter.swapCallParameters(trade, {
        slippageTolerance: new Percent(50, 10000),
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        recipient: account.address,
      });

      await executeSwap(
        walletClient,
        publicClient,
        methodParameters,
        "USDC → USDT"
      );
      await delay(5000); // Wait 5 seconds before next transaction
    } else {
      logger.warn("No route found for USDC → USDT");
    }

    // ============================================
    // 4. ERC20 TO ERC20 SWAP (WETH → WBTC)
    // ============================================
    logger.header("4️⃣ ERC20 to ERC20 Swap: WETH → WBTC");

    // Define tokens for this swap
    const WETH_TO_WBTC_INPUT = baseMantleTestnetTokens.weth;
    const WETH_TO_WBTC_OUTPUT = baseMantleTestnetTokens.wbtc;

    const wethToWbtcAmount = "0.001"; // 0.001 WETH
    const wethToWbtcQuote = await quoter.getQuote(
      WETH_TO_WBTC_INPUT,
      WETH_TO_WBTC_OUTPUT,
      wethToWbtcAmount, // Pass decimal string
      TradeType.EXACT_INPUT,
      false // Don't adjust for gas
    );

    if (wethToWbtcQuote) {
      logger.info("Quote received:", {
        input: `${wethToWbtcAmount} ${WETH_TO_WBTC_INPUT.symbol}`,
        output: `${wethToWbtcQuote.outputAmount} ${WETH_TO_WBTC_OUTPUT.symbol}`,
        priceImpact: wethToWbtcQuote.priceImpact,
      });

      // Approve input token
      await checkAndApproveToken(
        walletClient,
        publicClient,
        WETH_TO_WBTC_INPUT.address as Address,
        parseUnits(wethToWbtcAmount, WETH_TO_WBTC_INPUT.decimals),
        account.address
      );

      // Use rawTrade directly from the quote
      if (!wethToWbtcQuote.rawTrade) {
        logger.error("No raw trade available in quote");
        return;
      }
      const trade = wethToWbtcQuote.rawTrade;
      const methodParameters = SwapRouter.swapCallParameters(trade, {
        slippageTolerance: new Percent(50, 10000),
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        recipient: account.address,
      });

      await executeSwap(
        walletClient,
        publicClient,
        methodParameters,
        "WETH → WBTC"
      );
      await delay(5000); // Wait 5 seconds before next transaction
    } else {
      logger.warn("No route found for WETH → WBTC");
    }

    // ============================================
    // 5. ERC20 TO ERC20 SWAP (USDC → DAI)
    // ============================================
    logger.header("5️⃣ ERC20 to ERC20 Swap: USDC → DAI");

    // Define tokens for this swap
    const USDC_TO_DAI_INPUT = baseMantleTestnetTokens.usdc;
    const USDC_TO_DAI_OUTPUT = baseMantleTestnetTokens.dai;

    const usdcToDaiAmount = "1"; // 1 USDC
    const usdcToDaiQuote = await quoter.getQuote(
      USDC_TO_DAI_INPUT,
      USDC_TO_DAI_OUTPUT,
      usdcToDaiAmount, // Pass decimal string
      TradeType.EXACT_INPUT,
      false // Don't adjust for gas
    );

    if (usdcToDaiQuote) {
      logger.info("Quote received:", {
        input: `${usdcToDaiAmount} ${USDC_TO_DAI_INPUT.symbol}`,
        output: `${usdcToDaiQuote.outputAmount} ${USDC_TO_DAI_OUTPUT.symbol}`,
        priceImpact: usdcToDaiQuote.priceImpact,
      });

      // Approve input token
      await checkAndApproveToken(
        walletClient,
        publicClient,
        USDC_TO_DAI_INPUT.address as Address,
        parseUnits(usdcToDaiAmount, USDC_TO_DAI_INPUT.decimals),
        account.address
      );

      // Use rawTrade directly from the quote
      if (!usdcToDaiQuote.rawTrade) {
        logger.error("No raw trade available in quote");
        return;
      }
      const trade = usdcToDaiQuote.rawTrade;
      const methodParameters = SwapRouter.swapCallParameters(trade, {
        slippageTolerance: new Percent(50, 10000),
        deadline: Math.floor(Date.now() / 1000) + 60 * 20,
        recipient: account.address,
      });

      await executeSwap(
        walletClient,
        publicClient,
        methodParameters,
        "USDC → DAI"
      );
      await delay(5000); // Wait 5 seconds before next transaction
    } else {
      logger.warn("No route found for USDC → DAI");
    }

    // ============================================
    // FINAL BALANCES
    // ============================================
    logger.header("📊 Final Results");

    const finalBalances = await getBalances(publicClient, account.address);
    logger.success("Final balances:", finalBalances);

    logger.info("Balance changes:", {
      native: `${initialBalances.native} → ${finalBalances.native} MANTLE`,
      usdc: `${initialBalances.usdc} → ${finalBalances.usdc} USDC`,
      usdt: `${initialBalances.usdt} → ${finalBalances.usdt} USDT`,
      weth: `${initialBalances.weth} → ${finalBalances.weth} WETH`,
      wbtc: `${initialBalances.wbtc} → ${finalBalances.wbtc} WBTC`,
      dai: `${initialBalances.dai} → ${finalBalances.dai} DAI`,
    });

    logger.success("🎉 All swap examples completed!");
  } catch (error: any) {
    // Handle rate limiting errors with cleaner output
    if (
      error?.message?.includes("429") ||
      error?.message?.includes("Too Many Requests")
    ) {
      logger.error("⚠️ Rate Limited: Too many requests to RPC endpoint");
      logger.info("💡 Tips:");
      logger.info("  - Wait a few seconds and try again");
      logger.info("  - Use a different RPC endpoint");
      logger.info("  - Increase delays between transactions");
    } else if (error?.shortMessage) {
      // Show short message if available
      logger.error("Error:", error.shortMessage);
    } else {
      // Show only the error message, not the full object
      logger.error("Error:", error?.message || "Unknown error occurred");
    }
    process.exit(1);
  }
}

main().catch((error: any) => {
  if (error?.message?.includes("429")) {
    logger.error("⚠️ Rate limited - try again later");
  } else {
    logger.error("Failed to run swap examples:", error?.message || error);
  }
  process.exit(1);
});
