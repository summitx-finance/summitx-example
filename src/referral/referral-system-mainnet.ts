/**
 * Referral System Examples - Mainnet
 *
 * Example scripts for interacting with the referral system on mainnet.
 * Uses core functions from referral-system.ts
 */

import { ChainId } from "@fusionx-finance/sdk";
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
import { getContractsForChain } from "../config/chains";
import { mantleMainnet } from "../config/mantle-mainnet";
import { logger } from "../utils/logger";
import { delay, waitForTransaction } from "../utils/transaction-helpers";
import {
  applyReferralCode,
  getAppliedReferralCode,
  getReferralCodeInfo,
  getReferrerCode,
  referralCodeToString,
  registerReferralCode,
  stringToReferralCode,
} from "./referral-system";

config();

async function main() {
  const command = process.argv[2];
  const codeArg = process.argv[3];

  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const privateKey = process.env.PRIVATE_KEY as Hex;
  const account = privateKeyToAccount(privateKey);
  const contracts = getContractsForChain(ChainId.MANTLE);

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

  if (!contracts.REFERRAL_HANDLER_V2) {
    logger.error("ReferralHandlerV2 address not configured");
    process.exit(1);
  }

  const referralHandlerAddress = contracts.REFERRAL_HANDLER_V2 as Address;

  try {
    switch (command) {
      case "get": {
        logger.header("🔗 Referral System: Get Referral Code (Mainnet)");
        logger.info("Retrieving your referral code");
        logger.divider();

        const referralCode = await getReferrerCode(
          publicClient,
          referralHandlerAddress,
          account.address
        );

        if (!referralCode) {
          logger.warn("⚠️ No referral code found for this address");
          logger.info("Use 'register <CODE>' to create one");
        } else {
          const codeString = referralCodeToString(referralCode);
          const referralLink = `${
            process.env.FRONTEND_URL || "https://your-frontend.com"
          }/?ref=${codeString}`;

          logger.success("✅ Referral code retrieved!", {
            "Referral Code": codeString,
            "Referral Link": referralLink,
            Bytes32: referralCode,
          });
        }
        break;
      }

      case "register": {
        if (!codeArg) {
          logger.error("Please provide a referral code to register");
          logger.info(
            "Usage: tsx src/referral/referral-system-mainnet.ts register <CODE>"
          );
          process.exit(1);
        }

        logger.header("🔗 Referral System: Register Referral Code (Mainnet)");
        logger.info("Registering a new referral code");
        logger.divider();

        if (!codeArg || codeArg.length === 0 || codeArg.length > 32) {
          logger.error("Invalid referral code. Code must be 1-32 characters");
          process.exit(1);
        }

        // Check code availability
        logger.info("Checking code availability...");
        const codeBytes = stringToReferralCode(codeArg);
        const codeInfo = await getReferralCodeInfo(
          publicClient,
          referralHandlerAddress,
          codeBytes
        );

        if (!codeInfo.isAvailable) {
          logger.error("❌ Referral code is already taken");
          logger.info(`Current owner: ${codeInfo.payoutAddress}`);
          process.exit(1);
        }

        logger.success("✅ Code is available!");

        await delay(2000);

        // Register the code
        logger.info("Registering referral code...");
        const txHash = await registerReferralCode(
          walletClient,
          publicClient,
          referralHandlerAddress,
          codeArg
        );

        logger.info(`Transaction sent: ${txHash}`);
        await waitForTransaction(
          publicClient,
          txHash,
          "register referral code"
        );

        // Verify registration
        await delay(2000);
        const registeredCode = await getReferrerCode(
          publicClient,
          referralHandlerAddress,
          account.address
        );

        if (registeredCode) {
          const codeString = referralCodeToString(registeredCode);
          const referralLink = `${
            process.env.FRONTEND_URL || "https://your-frontend.com"
          }/?ref=${codeString}`;

          logger.success("✅ Referral code registered successfully!", {
            "Referral Code": codeString,
            "Referral Link": referralLink,
            "Transaction Hash": txHash,
          });
        } else {
          logger.warn("⚠️ Registration may not have completed correctly");
        }
        break;
      }

      case "apply": {
        if (!codeArg) {
          logger.error("Please provide a referral code to apply");
          logger.info(
            "Usage: tsx src/referral/referral-system-mainnet.ts apply <CODE>"
          );
          process.exit(1);
        }

        logger.header("🔗 Referral System: Apply Referral Code (Mainnet)");
        logger.info("Applying a referral code to your wallet");
        logger.divider();

        // Check if user already has a referral code applied
        logger.info("Checking current referral code status...");
        const existingCode = await getAppliedReferralCode(
          publicClient,
          referralHandlerAddress,
          account.address
        );

        if (existingCode) {
          const existingCodeString = referralCodeToString(existingCode);
          logger.warn(
            `⚠️ You already have a referral code applied: ${existingCodeString}`
          );
          logger.info("You can only apply one referral code per wallet");
          process.exit(0);
        }

        await delay(2000);

        // Apply the referral code
        logger.info("Applying referral code...");
        const txHash = await applyReferralCode(
          walletClient,
          publicClient,
          referralHandlerAddress,
          account.address,
          codeArg
        );

        logger.info(`Transaction sent: ${txHash}`);
        await waitForTransaction(publicClient, txHash, "apply referral code");

        // Verify the referral code was applied
        await delay(2000);
        const appliedCode = await getAppliedReferralCode(
          publicClient,
          referralHandlerAddress,
          account.address
        );

        if (appliedCode) {
          const appliedCodeString = referralCodeToString(appliedCode);
          logger.success("✅ Referral code applied successfully!", {
            "Applied Code": appliedCodeString,
            "Transaction Hash": txHash,
          });
        } else {
          logger.warn("⚠️ Referral code may not have been applied correctly");
        }
        break;
      }

      case "check": {
        logger.header(
          "🔗 Referral System: Check Referral Code Status (Mainnet)"
        );
        logger.info("Checking your referral code status");
        logger.divider();

        // Check if user has a referral code (as referrer)
        logger.info("Checking if you have a referral code...");
        const referrerCode = await getReferrerCode(
          publicClient,
          referralHandlerAddress,
          account.address
        );

        if (referrerCode) {
          const codeString = referralCodeToString(referrerCode);
          const referralLink = `${
            process.env.FRONTEND_URL || "https://your-frontend.com"
          }/?ref=${codeString}`;

          // Get code statistics
          const codeInfo = await getReferralCodeInfo(
            publicClient,
            referralHandlerAddress,
            referrerCode
          );

          logger.success("✅ You have a referral code!", {
            "Your Referral Code": codeString,
            "Referral Link": referralLink,
            Volume: formatUnits(codeInfo.volume, 18),
            "Accumulated Fees": formatUnits(codeInfo.accumulatedFees, 18),
            "Custom Duration": codeInfo.customDuration.toString(),
            "Payout Address": codeInfo.payoutAddress,
          });
        } else {
          logger.info("ℹ️ You don't have a referral code yet");
          logger.info("Use 'register <CODE>' to create one");
        }

        logger.divider();

        // Check if user has applied a referral code
        logger.info("Checking if you have applied a referral code...");
        const appliedCode = await getAppliedReferralCode(
          publicClient,
          referralHandlerAddress,
          account.address
        );

        if (appliedCode) {
          const appliedCodeString = referralCodeToString(appliedCode);
          logger.success("✅ You have applied a referral code!", {
            "Applied Code": appliedCodeString,
          });
        } else {
          logger.info("ℹ️ You haven't applied any referral code yet");
          logger.info("Use 'apply <CODE>' to apply one");
        }

        // If a specific code was provided, check its availability
        if (codeArg) {
          logger.divider();
          logger.info(`Checking availability of code: ${codeArg}`);
          const codeBytes = stringToReferralCode(codeArg);
          const codeInfo = await getReferralCodeInfo(
            publicClient,
            referralHandlerAddress,
            codeBytes
          );

          if (codeInfo.isAvailable) {
            logger.success("✅ Code is available!", {
              Code: codeArg,
            });
          } else {
            logger.warn("⚠️ Code is already taken", {
              Code: codeArg,
              Owner: codeInfo.payoutAddress,
              Volume: formatUnits(codeInfo.volume, 18),
              "Accumulated Fees": formatUnits(codeInfo.accumulatedFees, 18),
            });
          }
        }
        break;
      }

      default:
        logger.info("Referral System CLI - Mainnet");
        logger.info("");
        logger.info("Usage:");
        logger.info("  tsx src/referral/referral-system-mainnet.ts get");
        logger.info(
          "  tsx src/referral/referral-system-mainnet.ts register <CODE>"
        );
        logger.info(
          "  tsx src/referral/referral-system-mainnet.ts apply <CODE>"
        );
        logger.info(
          "  tsx src/referral/referral-system-mainnet.ts check [CODE]"
        );
        logger.info("");
        logger.info("Examples:");
        logger.info("  tsx src/referral/referral-system-mainnet.ts get");
        logger.info(
          "  tsx src/referral/referral-system-mainnet.ts register MYCODE123"
        );
        logger.info(
          "  tsx src/referral/referral-system-mainnet.ts apply MYCODE123"
        );
        logger.info(
          "  tsx src/referral/referral-system-mainnet.ts check MYCODE123"
        );
        break;
    }
  } catch (error: any) {
    logger.error("Error:", error?.message || "Unknown error");
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error?.message || error);
  process.exit(1);
});
