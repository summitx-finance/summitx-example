/**
 * Launchpad Access Registration Example (Testnet)
 * Register with invite code to gain access to launchpad
 *
 * This example demonstrates registering with an invite code using the AccessRegistry contract.
 */

import { ChainId } from "@summitx/chains";
import { config } from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  http,
  TransactionReceipt,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ACCESS_REGISTRY_ABI } from "../config/abis";
import { basecampTestnet } from "../config/base-testnet";
import { getContractsForChain } from "../config/chains";
import { generateLeaf, generateProof } from "../utils/launchpad-helpers";
import { logger } from "../utils/logger";
import { delay, waitForTransaction } from "../utils/transaction-helpers";

config();

async function main() {
  logger.header("🔐 Launchpad Access Registration (Testnet)");
  logger.info("Registering with invite code to gain access to launchpad");
  logger.divider();

  const contracts = getContractsForChain(ChainId.BASECAMP);

  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  // Get access code from environment or use placeholder
  const accessCode = process.env.ACCESS_CODE || "HIJKLM";
  if (!accessCode.trim()) {
    logger.error("Please set ACCESS_CODE in .env file or pass as argument");
    logger.info(
      "Example: ACCESS_CODE=your-invite-code npm run launchpad:register-access"
    );
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

  const publicClient = createPublicClient({
    chain: basecampTestnet,
    transport: http(basecampTestnet.rpcUrls.default.http[0]),
  });

  const walletClient = createWalletClient({
    account,
    chain: basecampTestnet,
    transport: http(basecampTestnet.rpcUrls.default.http[0]),
  });

  logger.info(`Wallet address: ${account.address}`);
  logger.info(`Access code: ${accessCode}`);

  // Check if already registered
  try {
    const isRegistered = await publicClient.readContract({
      address: contracts.ACCESS_REGISTRY as Address,
      abi: ACCESS_REGISTRY_ABI,
      functionName: "isAccessible",
      args: [account.address],
    });

    if (isRegistered) {
      logger.success("✅ Account is already registered!");
      logger.info("You already have access to the launchpad.");
      return;
    }
  } catch (error: any) {
    logger.warn("Could not check registration status:", error?.message);
  }

  try {
    await delay(2000);

    // Generate leaf from access code
    logger.info("Generating leaf hash from access code...");
    const leaf = generateLeaf(accessCode);
    logger.info(`Leaf hash: ${leaf}`);

    // Get merkle proof from API
    logger.info("Fetching merkle proof from API...");
    const proof = await generateProof(accessCode, ChainId.BASECAMP);

    if (proof.length === 0) {
      logger.error("Invalid Code: Proof is empty");
      process.exit(1);
    }

    logger.success(`Proof received: ${proof.length} elements`);

    // Register with invite code
    logger.info("Registering with invite code...");
    logger.info(`AccessRegistry: ${contracts.ACCESS_REGISTRY}`);
    logger.info(`Leaf: ${leaf}`);
    logger.info(`Proof length: ${proof.length}`);

    const txHash = await walletClient.writeContract({
      address: contracts.ACCESS_REGISTRY as Address,
      abi: ACCESS_REGISTRY_ABI,
      functionName: "registerWithInviteCode",
      args: [leaf, proof],
    } as any);

    logger.info(`Transaction sent: ${txHash}`);
    const receipt = await waitForTransaction(
      publicClient,
      txHash,
      "access registration"
    );

    // Check if transaction actually succeeded
    if (receipt.status === "success") {
      logger.success("✅ Access registration successful!", {
        "Transaction hash": txHash,
        "Block number": receipt.blockNumber.toString(),
      });

      // Verify registration
      await delay(2000);
      const isRegistered = await publicClient.readContract({
        address: contracts.ACCESS_REGISTRY as Address,
        abi: ACCESS_REGISTRY_ABI,
        functionName: "isAccessible",
        args: [account.address],
      });

      if (isRegistered) {
        logger.success(
          "✅ Registration verified! You now have access to the launchpad."
        );
      } else {
        logger.warn(
          "⚠️ Registration transaction succeeded but account is not showing as registered."
        );
        logger.warn(
          "This might be a temporary issue. Please check again later."
        );
      }
    } else {
      logger.error("Transaction failed on-chain");
      logger.error("Invalid invite code or proof.");
      process.exit(1);
    }
  } catch (error: any) {
    logger.error(
      "Error:",
      error?.shortMessage || error?.message || "Unknown error"
    );

    // Extract error message if available
    const errorMsg =
      error?.shortMessage || error?.message || "Transaction failed";
    if (
      errorMsg.includes("Invalid invite code") ||
      errorMsg.includes("revert") ||
      errorMsg.includes("Invalid Code")
    ) {
      logger.error(
        "Invalid Code: The provided access code is invalid or has already been used."
      );
    } else if (errorMsg.includes("Proof API")) {
      logger.error(
        "Failed to fetch proof from API. Please check PROOF_API_URL environment variable."
      );
    } else {
      logger.error(errorMsg);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error?.message || error);
  process.exit(1);
});
