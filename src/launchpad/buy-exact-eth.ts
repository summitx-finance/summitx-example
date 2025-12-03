/**
 * Launchpad Trade Example: buyExactEth (Testnet)
 * Buy tokens with exact native ETH amount
 *
 * This example demonstrates buying tokens using native ETH on the launchpad
 * using the ReferralRouter contract's buyExactEth function.
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
import { delay, waitForTransaction } from "../utils/transaction-helpers";

config();

async function main() {
  logger.header("🚀 Launchpad Trade: buyExactEth (Testnet)");
  logger.info("Buying tokens with exact native ETH amount");
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

  // Token to buy (example: USDC - replace with actual launchpad token)
  const TOKEN_TO_BUY = megaethTestnetLaunchpadToken.MEOW;
  const NATIVE_TOKEN_SYMBOL = "ETH";

  // Check native balance
  const nativeBalance = await publicClient.getBalance({
    address: account.address,
  });
  logger.info(
    `Native ETH balance: ${formatUnits(
      nativeBalance,
      megaethTestnet.nativeCurrency.decimals
    )}`
  );

  if (
    nativeBalance < parseUnits("0.1", megaethTestnet.nativeCurrency.decimals)
  ) {
    logger.error("Insufficient ETH balance. Need at least 0.1 ETH");
    process.exit(1);
  }

  try {
    await delay(2000);

    // Define buy amount (native ETH to spend)
    const buyAmount = "0.01"; // 0.01 ETH

    logger.info(
      `Getting launchpad quote for ${buyAmount} ETH → ${TOKEN_TO_BUY.symbol}...`
    );

    // Get launchpad quote
    const quote = await getLaunchpadQuote(
      publicClient,
      contracts.LAUNCHPAD as Address,
      TOKEN_TO_BUY.address as Address,
      buyAmount,
      "buy",
      NATIVE_TOKEN_SYMBOL,
      NATIVE_TOKEN_SYMBOL
    );

    logger.success("Launchpad quote received:", {
      input: `${buyAmount} ETH`,
      output: `${quote.amountOutToken.toString()} ${TOKEN_TO_BUY.symbol}`,
      amountInEth: quote.amountInEth.toString(),
      amountOutToken: quote.amountOutToken.toString(),
    });

    // Get function name and arguments
    const actionType = "buy";
    const selectedSymbol = NATIVE_TOKEN_SYMBOL;
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
      referralCode
    );

    logger.info(`Function: ${functionName}`);
    logger.info(`Args:`, args);

    // Calculate native value to send (use quote.amountInEth)
    const nativeValue = quote.amountInEth;

    // Check initial token balance
    const initialTokenBalance = await publicClient.readContract({
      address: TOKEN_TO_BUY.address as Address,
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

    logger.info(
      `Initial ${TOKEN_TO_BUY.symbol} balance: ${formatUnits(
        initialTokenBalance,
        TOKEN_TO_BUY.decimals
      )}`
    );

    // Execute launchpad trade
    logger.info("Executing launchpad trade (buyExactEth)...");

    const txHash = await walletClient.writeContract({
      address: contracts.REFERRAL_ROUTER as Address,
      abi: REFERRAL_ROUTER_ABI,
      functionName: functionName as any,
      args: args as any,
      value: nativeValue as bigint, // Send native ETH
    } as any);

    logger.info(`Transaction sent: ${txHash}`);
    await waitForTransaction(publicClient, txHash, "launchpad trade");

    // Check final token balance
    await delay(2000);
    const finalTokenBalance = await publicClient.readContract({
      address: TOKEN_TO_BUY.address as Address,
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
