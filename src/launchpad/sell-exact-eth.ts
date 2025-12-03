/**
 * Launchpad Trade Example: sellExactEth (Testnet)
 * Sell exact ERC20 token amount for native ETH
 *
 * This example demonstrates selling ERC20 tokens for native ETH on the launchpad
 * using the ReferralRouter contract's sellExactEth function.
 */

import { ChainId } from "@summitx/chains";
import { config } from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { REFERRAL_ROUTER_ABI } from "../config/abis";
import {
  megaethTestnet,
  megaethTestnetLaunchpadToken,
} from "../config/megaeth-testnet";
import { getContractsForChain } from "../config/chains";
import {
  getArgs,
  getFunctionName,
  getLaunchpadQuote,
} from "../utils/launchpad-helpers";
import { logger } from "../utils/logger";
import {
  approveTokenWithWait,
  delay,
  waitForTransaction,
} from "../utils/transaction-helpers";

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
  logger.header("🚀 Launchpad Trade: sellExactEth (Testnet)");
  logger.info("Selling exact ERC20 token amount for native ETH");
  logger.divider();

  const contracts = getContractsForChain(ChainId.MEGAETH_TESTNET);

  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

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

  // Tokens to use - selling tokens for native ETH
  const INPUT_TOKEN = megaethTestnetLaunchpadToken.MEOW; // Token to sell (e.g., DERP)
  const NATIVE_TOKEN_SYMBOL = "ETH"; // Token to receive (native ETH)

  // Define sell amount (ERC20 tokens to sell)
  const sellAmount = "0.01"; // 0.01 ETH

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

  try {
    await delay(2000);

    logger.info(
      `Getting launchpad quote for ${sellAmount} ${INPUT_TOKEN.symbol} → ${NATIVE_TOKEN_SYMBOL}...`
    );

    // Get launchpad quote - always use the launchpad token address (output token)
    const quote = await getLaunchpadQuote(
      publicClient,
      contracts.LAUNCHPAD as Address,
      INPUT_TOKEN.address as Address, // Launchpad token address (token being sold)
      sellAmount,
      "sell",
      NATIVE_TOKEN_SYMBOL, // Receiving native ETH
      NATIVE_TOKEN_SYMBOL
    );

    logger.success("Launchpad quote received:", {
      input: `${sellAmount} ${INPUT_TOKEN.symbol}`,
      output: `${quote.amountOutEth.toString()} ${NATIVE_TOKEN_SYMBOL}`,
      amountInToken: quote.amountInToken.toString(),
      amountOutEth: quote.amountOutEth.toString(),
    });

    const amountToApprove = quote.amountInToken;
    logger.info(
      `Approving ${amountToApprove} ${INPUT_TOKEN.symbol} to ReferralRouter...`
    );

    if (amountToApprove > inputBalance) {
      logger.error(
        `Insufficient ${INPUT_TOKEN.symbol} balance. Need at least ${amountToApprove} ${INPUT_TOKEN.symbol}`
      );
      process.exit(1);
    }

    await approveTokenWithWait(
      walletClient,
      publicClient,
      INPUT_TOKEN.address as Address,
      contracts.REFERRAL_ROUTER as Address,
      amountToApprove,
      INPUT_TOKEN.symbol,
      3000
    );

    // Get function name and arguments
    const actionType = "sell";
    const selectedSymbol = NATIVE_TOKEN_SYMBOL; // Receiving native ETH
    const referralCode =
      "0x0000000000000000000000000000000000000000000000000000000000000000"; // Empty referral code

    const functionName = getFunctionName(
      actionType,
      selectedSymbol,
      NATIVE_TOKEN_SYMBOL
    );
    const args = getArgs(
      actionType,
      selectedSymbol,
      INPUT_TOKEN.address as Address,
      quote,
      referralCode,
      NATIVE_TOKEN_SYMBOL
    );

    logger.info(`Function: ${functionName}`);
    logger.info(`Args:`, args);

    // Check initial native balance
    const initialNativeBalance = await publicClient.getBalance({
      address: account.address,
    });

    logger.info(
      `Initial ${NATIVE_TOKEN_SYMBOL} balance: ${formatUnits(
        initialNativeBalance,
        18
      )}`
    );

    // Execute launchpad trade
    logger.info("Executing launchpad trade (sellExactEth)...");

    const txHash = await walletClient.writeContract({
      address: contracts.REFERRAL_ROUTER as Address,
      abi: REFERRAL_ROUTER_ABI,
      functionName: functionName as any,
      args: args as any,
      // No native value to send (we're selling tokens, not sending native)
    });

    logger.info(`Transaction sent: ${txHash}`);
    await waitForTransaction(publicClient, txHash, "launchpad trade");

    // Check final native balance
    await delay(4000);
    const finalNativeBalance = await publicClient.getBalance({
      address: account.address,
    });

    const nativeReceived = finalNativeBalance - initialNativeBalance;

    logger.success("✅ Launchpad trade successful!", {
      [`${NATIVE_TOKEN_SYMBOL} received`]: formatUnits(nativeReceived, 18),
      [`New ${NATIVE_TOKEN_SYMBOL} balance`]: formatUnits(
        finalNativeBalance,
        18
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
