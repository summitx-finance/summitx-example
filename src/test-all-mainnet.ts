import { exec } from "child_process";
import { config } from "dotenv";
import { promisify } from "util";
import { createPublicClient, formatUnits, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { campMainnet, campMainnetTokens } from "./config/camp-mainnet";
import { logger } from "./utils/logger";

config();

const execAsync = promisify(exec);

interface TestResult {
  name: string;
  category: string;
  success: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

async function delay(ms: number, message?: string) {
  if (message) {
    logger.info(`Waiting ${ms / 1000}s - ${message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest(
  command: string,
  name: string,
  category: string
): Promise<boolean> {
  const startTime = Date.now();
  logger.info(`Running: ${name}`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes("DeprecationWarning")) {
      console.error(stderr);
    }

    const duration = Date.now() - startTime;
    results.push({ name, category, success: true, duration });
    logger.success(`Passed: ${name} (${(duration / 1000).toFixed(1)}s)`);
    return true;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error?.message || String(error);
    results.push({ name, category, success: false, duration, error: errorMessage });
    logger.error(`Failed: ${name} - ${errorMessage.substring(0, 100)}`);
    return false;
  }
}

function skipTest(name: string, category: string, reason: string) {
  logger.warn(`Skipped: ${name} - ${reason}`);
  results.push({ name, category, success: true, duration: 0, error: `SKIPPED: ${reason}` });
}

async function checkBalances() {
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

  const publicClient = createPublicClient({
    chain: campMainnet,
    transport: http("https://rpc.camp.raas.gelato.cloud"),
  });

  const nativeBalance = await publicClient.getBalance({
    address: account.address,
  });

  const usdcBalance = await publicClient.readContract({
    address: campMainnetTokens.usdc.address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });

  return { nativeBalance, usdcBalance };
}

async function printSummary() {
  logger.header("TEST SUMMARY");

  const categories = [...new Set(results.map((r) => r.category))];

  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const category of categories) {
    const categoryResults = results.filter((r) => r.category === category);
    const passed = categoryResults.filter((r) => r.success && !r.error?.startsWith("SKIPPED")).length;
    const failed = categoryResults.filter((r) => !r.success).length;
    const skipped = categoryResults.filter((r) => r.error?.startsWith("SKIPPED")).length;

    totalPassed += passed;
    totalFailed += failed;
    totalSkipped += skipped;

    console.log(`\n${category}:`);
    for (const result of categoryResults) {
      if (result.error?.startsWith("SKIPPED")) {
        console.log(`  \x1b[33m[SKIP]\x1b[0m ${result.name}`);
      } else {
        const status = result.success ? "[PASS]" : "[FAIL]";
        const statusColor = result.success ? "\x1b[32m" : "\x1b[31m";
        console.log(
          `  ${statusColor}${status}\x1b[0m ${result.name} (${(
            result.duration / 1000
          ).toFixed(1)}s)`
        );
      }
    }
  }

  logger.divider();
  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`);

  if (totalPassed + totalFailed > 0) {
    const passRate = ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1);
    if (totalFailed === 0) {
      logger.success(`Pass rate: ${passRate}%`);
    } else {
      logger.warn(`Pass rate: ${passRate}%`);
    }
  }

  return totalFailed === 0;
}

async function main() {
  const startTime = Date.now();

  logger.header("SummitX DEX - MAINNET Complete Test Suite");
  logger.info("Camp Mainnet");
  logger.divider();

  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);
  logger.info(`Wallet: ${account.address}`);

  // Pre-flight balance check
  logger.header("Pre-flight Balance Check");
  const { nativeBalance, usdcBalance } = await checkBalances();
  logger.info(`Native CAMP: ${formatUnits(nativeBalance, 18)}`);
  logger.info(`USDC: ${formatUnits(usdcBalance, 6)}`);
  logger.divider();

  // ========================================
  // CATEGORY 1: Wrap/Unwrap
  // ========================================
  logger.header("CATEGORY 1: Wrap/Unwrap");

  await runTest("npx tsx src/wrap-unwrap-example-mainnet.ts", "mainnet:wrap-unwrap", "Wrap/Unwrap");
  await delay(5000);

  // ========================================
  // CATEGORY 2: Swaps
  // ========================================
  logger.header("CATEGORY 2: Swap Tests");

  await runTest("npx tsx src/native-to-erc20-swap-mainnet.ts", "mainnet:swap:native-to-erc20", "Swaps");
  await delay(5000);

  await runTest("npx tsx src/erc20-to-native-swap-mainnet.ts", "mainnet:swap:erc20-to-native", "Swaps");
  await delay(5000);

  await runTest("npx tsx src/erc20-to-erc20-swap-mainnet.ts", "mainnet:swap:erc20-to-erc20", "Swaps");
  await delay(5000);

  await runTest("npx tsx src/erc20-to-native-multicall-mainnet.ts", "mainnet:swap:erc20-to-native-multicall", "Swaps");
  await delay(5000);

  // ========================================
  // CATEGORY 3: Liquidity V2 (Interactive - Skipped)
  // ========================================
  logger.header("CATEGORY 3: Liquidity V2 (Interactive Scripts)");
  logger.warn("These scripts require interactive input. Run manually:");
  logger.info("  npm run mainnet:liquidity:add-v2");
  logger.info("  npm run liquidity:remove-v2-mainnet");
  logger.info("  npm run liquidity:native-mainnet");

  skipTest("mainnet:liquidity:add-v2", "Liquidity V2", "Interactive input required");
  skipTest("liquidity:remove-v2-mainnet", "Liquidity V2", "Interactive input required");
  skipTest("liquidity:native-mainnet", "Liquidity V2", "Interactive input required");

  // ========================================
  // CATEGORY 4: Liquidity V3 (Interactive - Skipped)
  // ========================================
  logger.header("CATEGORY 4: Liquidity V3 (Interactive Scripts)");
  logger.warn("These scripts require interactive input. Run manually:");
  logger.info("  npm run mainnet:liquidity:add-v3");
  logger.info("  npm run mainnet:liquidity:add-v3-simple");
  logger.info("  npm run liquidity:remove-v3-mainnet");
  logger.info("  npm run liquidity:collect-v3-mainnet");
  logger.info("  npm run liquidity:native-v3-mainnet");
  logger.info("  npm run liquidity:manage-mainnet");

  skipTest("mainnet:liquidity:add-v3", "Liquidity V3", "Interactive input required");
  skipTest("mainnet:liquidity:add-v3-simple", "Liquidity V3", "Interactive input required");
  skipTest("liquidity:remove-v3-mainnet", "Liquidity V3", "Interactive input required");
  skipTest("liquidity:collect-v3-mainnet", "Liquidity V3", "Interactive input required");
  skipTest("liquidity:native-v3-mainnet", "Liquidity V3", "Interactive input required");
  skipTest("liquidity:manage-mainnet", "Liquidity V3", "Interactive input required");

  // ========================================
  // CATEGORY 5: Launchpad
  // ========================================
  logger.header("CATEGORY 5: Launchpad");

  await runTest("npx tsx src/launchpad/register-access-mainnet.ts", "mainnet:launchpad:register-access", "Launchpad");
  await delay(5000);

  await runTest("npx tsx src/launchpad/buy-exact-eth-mainnet.ts", "mainnet:launchpad:buy-exact-eth", "Launchpad");
  await delay(5000);

  await runTest("npx tsx src/launchpad/buy-exact-tokens-mainnet.ts", "mainnet:launchpad:buy-exact-tokens", "Launchpad");
  await delay(5000);

  await runTest("npx tsx src/launchpad/sell-exact-eth-mainnet.ts", "mainnet:launchpad:sell-exact-eth", "Launchpad");
  await delay(5000);

  await runTest("npx tsx src/launchpad/sell-exact-tokens-mainnet.ts", "mainnet:launchpad:sell-exact-tokens", "Launchpad");
  await delay(5000);

  // ========================================
  // CATEGORY 6: Referral System
  // ========================================
  logger.header("CATEGORY 6: Referral System");

  await runTest("npx tsx src/referral/referral-system-mainnet.ts get", "mainnet:referral:get", "Referral");
  await delay(2000);

  await runTest("npx tsx src/referral/referral-system-mainnet.ts register", "mainnet:referral:register", "Referral");
  await delay(2000);

  await runTest("npx tsx src/referral/referral-system-mainnet.ts apply", "mainnet:referral:apply", "Referral");
  await delay(2000);

  await runTest("npx tsx src/referral/referral-system-mainnet.ts check", "mainnet:referral:check", "Referral");
  await delay(2000);

  // Post-test balance check
  logger.header("Post-Test Balance Check");
  const postBalances = await checkBalances();
  logger.info(`Native CAMP: ${formatUnits(postBalances.nativeBalance, 18)}`);
  logger.info(`USDC: ${formatUnits(postBalances.usdcBalance, 6)}`);

  const campUsed = parseFloat(formatUnits(nativeBalance - postBalances.nativeBalance, 18));
  logger.info(`CAMP used during tests: ${campUsed.toFixed(6)} CAMP`);

  // Print summary
  const allPassed = await printSummary();

  const totalDuration = (Date.now() - startTime) / 1000;
  logger.divider();
  logger.info(`Total test duration: ${totalDuration.toFixed(1)} seconds`);

  // Show interactive scripts reminder
  logger.header("Manual Testing Required");
  logger.warn("The following scripts require interactive input and must be tested manually:");
  console.log("\nLiquidity V2:");
  console.log("  npm run mainnet:liquidity:add-v2");
  console.log("  npm run liquidity:remove-v2-mainnet");
  console.log("  npm run liquidity:native-mainnet");
  console.log("\nLiquidity V3:");
  console.log("  npm run mainnet:liquidity:add-v3");
  console.log("  npm run mainnet:liquidity:add-v3-simple");
  console.log("  npm run liquidity:remove-v3-mainnet");
  console.log("  npm run liquidity:collect-v3-mainnet");
  console.log("  npm run liquidity:native-v3-mainnet");
  console.log("  npm run liquidity:manage-mainnet");

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  logger.error("Fatal error:", error?.message || error);
  process.exit(1);
});
