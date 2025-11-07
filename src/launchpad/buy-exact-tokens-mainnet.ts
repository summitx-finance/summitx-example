/**
 * Launchpad Trade Example: buyExactTokens
 * Buy tokens with exact ERC20 token amount (e.g., USDC)
 *
 * This example demonstrates buying tokens using ERC20 tokens (like USDC) on the launchpad
 * using the ReferralRouter contract's buyExactTokens function.
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
import { delay, waitForTransaction } from "../utils/transaction-helpers";

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
  logger.header("🚀 Launchpad Trade: buyExactTokens");
  logger.info("Buying tokens with exact ERC20 token amount (e.g., USDC)");
  logger.divider();

  const contracts = getContractsForChain(ChainId.BASECAMP);

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

  // Tokens to use
  const INPUT_TOKEN = "CAMP"; // Token to spend (native CAMP)
  const TOKEN_TO_BUY = campMainnetLaunchpadToken.MIKO; // Token to buy (example: WCAMP, replace with actual launchpad token)
  const NATIVE_TOKEN_SYMBOL = "CAMP";
  const buyAmount = "100"; // 100 MIKO

  // Check input token balance
  const inputBalance = await publicClient.getBalance({
    address: account.address,
  });

  logger.info(
    `${INPUT_TOKEN} Balance: ${formatUnits(
      inputBalance,
      campMainnet.nativeCurrency.decimals
    )}`
  );

  if (
    inputBalance < parseUnits(buyAmount, campMainnet.nativeCurrency.decimals)
  ) {
    logger.error(
      `Insufficient ${INPUT_TOKEN} balance. Need at least ${buyAmount} ${INPUT_TOKEN}`
    );
    process.exit(1);
  }

  try {
    await delay(2000);

    logger.info(
      `Getting launchpad quote for ${buyAmount} ${INPUT_TOKEN} → ${TOKEN_TO_BUY.symbol}...`
    );

    // Get launchpad quote - always use the launchpad token address (output token)
    const quote = await getLaunchpadQuote(
      publicClient,
      contracts.LAUNCHPAD as Address,
      TOKEN_TO_BUY.address as Address, // Launchpad token address (output token)
      buyAmount,
      "buy",
      TOKEN_TO_BUY.symbol,
      NATIVE_TOKEN_SYMBOL
    );

    logger.success("Launchpad quote received:", {
      input: `${buyAmount} ${INPUT_TOKEN}`,
      output: `${quote.amountOutToken.toString()} ${TOKEN_TO_BUY.symbol}`,
      amountInToken: quote.amountInToken.toString(),
      amountOutToken: quote.amountOutToken.toString(),
    });

    // Get function name and arguments
    const actionType = "buy";
    const selectedSymbol = TOKEN_TO_BUY.symbol;
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
      TOKEN_TO_BUY.address as Address,
      quote,
      referralCode,
      NATIVE_TOKEN_SYMBOL
    );

    logger.info(`Function: ${functionName}`);
    logger.info(`Args:`, args);

    // Check initial token balance
    const initialTokenBalance = await publicClient.readContract({
      address: TOKEN_TO_BUY.address as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });

    logger.info(
      `Initial ${TOKEN_TO_BUY.symbol} balance: ${formatUnits(
        initialTokenBalance,
        TOKEN_TO_BUY.decimals
      )}`
    );

    // Execute launchpad trade
    logger.info("Executing launchpad trade (buyExactTokens)...");

    const txHash = await walletClient.writeContract({
      address: contracts.REFERRAL_ROUTER as Address,
      abi: REFERRAL_ROUTER_ABI,
      functionName: functionName as any,
      args: args as any,
      value: actionType === "buy" ? (quote.amountInEth as bigint) : 0n,
    } as any);

    logger.info(`Transaction sent: ${txHash}`);
    await waitForTransaction(publicClient, txHash, "launchpad trade");

    // Check final token balance
    await delay(4000);
    const finalTokenBalance = await publicClient.readContract({
      address: TOKEN_TO_BUY.address as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });

    const tokensReceived = finalTokenBalance - initialTokenBalance;

    logger.success("✅ Launchpad trade successful!", {
      [`${TOKEN_TO_BUY.symbol} received`]: formatUnits(
        tokensReceived,
        TOKEN_TO_BUY.decimals
      ),
      [`New ${TOKEN_TO_BUY.symbol} balance`]: formatUnits(
        finalTokenBalance,
        TOKEN_TO_BUY.decimals
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
