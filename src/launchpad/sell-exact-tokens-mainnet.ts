/**
 * Launchpad Trade Example: sellExactEth
 * Sell exact ERC20 token amount for native CAMP
 *
 * This example demonstrates selling ERC20 tokens for native CAMP on the launchpad
 * using the ReferralRouter contract's sellExactEth function.
 */

import { ChainId } from "@summitx/chains";
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
import { REFERRAL_ROUTER_ABI } from "../config/abis";
import { campMainnet, campMainnetLaunchpadToken } from "../config/camp-mainnet";
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
  logger.header("🚀 Launchpad Trade: sellExactTokens (Mainnet)");
  logger.info("Selling exact ERC20 token amount for native CAMP");
  logger.divider();

  const contracts = getContractsForChain(ChainId.CAMP);

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

  // Tokens to use - selling tokens for native CAMP
  const INPUT_TOKEN = campMainnetLaunchpadToken.MIKO; // Token to sell (e.g., MIKO)
  const NATIVE_TOKEN_SYMBOL = "CAMP"; // Token to receive (native CAMP)

  // Define sell amount (ERC20 tokens to sell)
  const sellAmount = "100"; // 100 MIKO

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

  if (inputBalance < parseUnits(sellAmount, INPUT_TOKEN.decimals)) {
    logger.error(
      `Insufficient ${INPUT_TOKEN.symbol} balance. Need at least 0.5 ${INPUT_TOKEN.symbol}`
    );
    process.exit(1);
  }

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
      INPUT_TOKEN.symbol, // Receiving native CAMP
      NATIVE_TOKEN_SYMBOL
    );

    logger.success("Launchpad quote received:", {
      input: `${sellAmount} ${INPUT_TOKEN.symbol}`,
      output: `${quote.amountOutEth.toString()} ${NATIVE_TOKEN_SYMBOL}`,
      amountInToken: quote.amountInToken.toString(),
      amountOutEth: quote.amountOutEth.toString(),
    });

    // Approve ReferralRouter to spend input token (use quote.amountInToken)
    const amountToApprove = quote.amountInToken;
    logger.info(
      `Approving ${amountToApprove} ${INPUT_TOKEN.symbol} to ReferralRouter...`
    );
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
    const selectedSymbol = INPUT_TOKEN.symbol; // Receiving native CAMP
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
    logger.info("Executing launchpad trade (sellExactTokens) (Mainnet)...");

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
