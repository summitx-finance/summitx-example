import { ChainId } from "@summitx/chains";
import { config } from "dotenv";
import readlineSync from "readline-sync";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseAbi,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { megaethTestnet, megaEthTestnetTokens } from "../config/megaeth-testnet";
import { getContractsForChain } from "../config/chains";
import { logger } from "../utils/logger";
import { approveTokenWithWait } from "../utils/transaction-helpers";

config();

// ABIs
const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
]);

const V2_ROUTER_ABI = parseAbi([
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)",
  "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) returns (uint amountToken, uint amountETH)",
  "function removeLiquidityETHWithPermit(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) returns (uint amountToken, uint amountETH)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
  "function quote(uint amountA, uint reserveA, uint reserveB) pure returns (uint amountB)",
  "function getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)",
]);

const V2_FACTORY_ABI = parseAbi([
  "function getPair(address tokenA, address tokenB) view returns (address pair)",
]);

const V2_PAIR_ABI = parseAbi([
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

interface TokenInfo {
  address: Address;
  symbol: string;
  decimals: number;
  balance: bigint;
}

async function getTokenInfo(
  publicClient: any,
  tokenAddress: Address,
  userAddress: Address
): Promise<TokenInfo> {
  const [symbol, decimals, balance] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "symbol",
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "decimals",
    }),
    publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [userAddress],
    }),
  ]);

  return { address: tokenAddress, symbol, decimals, balance };
}

const contracts = getContractsForChain(ChainId.MEGAETH_TESTNET);

async function getPairInfo(publicClient: any, tokenAddress: Address) {
  // Native ETH pairs use WCAMP internally
  const pairAddress = await publicClient.readContract({
    address: contracts.V2_FACTORY,
    abi: V2_FACTORY_ABI,
    functionName: "getPair",
    args: [contracts.WCAMP as Address, tokenAddress],
  });

  if (pairAddress === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  const [reserves, token0, token1, totalSupply] = await Promise.all([
    publicClient.readContract({
      address: pairAddress,
      abi: V2_PAIR_ABI,
      functionName: "getReserves",
    }),
    publicClient.readContract({
      address: pairAddress,
      abi: V2_PAIR_ABI,
      functionName: "token0",
    }),
    publicClient.readContract({
      address: pairAddress,
      abi: V2_PAIR_ABI,
      functionName: "token1",
    }),
    publicClient.readContract({
      address: pairAddress,
      abi: V2_PAIR_ABI,
      functionName: "totalSupply",
    }),
  ]);

  // Order reserves based on token addresses
  const isToken0WCAMP = token0.toLowerCase() === contracts.WCAMP.toLowerCase();
  const [reserveWCAMP, reserveToken] = isToken0WCAMP
    ? [reserves[0], reserves[1]]
    : [reserves[1], reserves[0]];

  return {
    pairAddress,
    reserveWCAMP,
    reserveToken,
    totalSupply,
    token0,
    token1,
  };
}

async function main() {
  logger.header("⚡ Native ETH Liquidity Management");
  logger.info("Add and remove liquidity using native ETH directly");
  logger.divider();

  const contracts = getContractsForChain(ChainId.MEGAETH_TESTNET);

  if (!process.env.PRIVATE_KEY) {
    logger.error("Please set PRIVATE_KEY in .env file");
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

  const publicClient = createPublicClient({
    chain: megaethTestnet,
    transport: http(
      process.env.MEGAETH_TESTNET_RPC_URL || "https://timothy.megaeth.com/mafia/rpc/n0m3q6w9e2r5t8y1u4i7o0p3a6s9d2f5g8h1j4k7"
    ),
  });

  const walletClient = createWalletClient({
    account,
    chain: megaethTestnet,
    transport: http(
      process.env.MEGAETH_TESTNET_RPC_URL || "https://timothy.megaeth.com/mafia/rpc/n0m3q6w9e2r5t8y1u4i7o0p3a6s9d2f5g8h1j4k7"
    ),
  });

  logger.info(`Wallet address: ${account.address}`);

  // Define native liquidity token pairs (excluding WCAMP since we're using native)
  const NATIVE_PAIR_TOKENS = [
    megaEthTestnetTokens.usdc,
    megaEthTestnetTokens.usdt,
    megaEthTestnetTokens.dai,
    megaEthTestnetTokens.weth,
  ];

  try {
    // Get native ETH balance
    const nativeBalance = await publicClient.getBalance({
      address: account.address,
    });

    logger.info(`\n💰 Native ETH balance: ${formatUnits(nativeBalance, 18)}`);

    if (nativeBalance < parseUnits("0.1", 18)) {
      logger.error("Insufficient native ETH balance (need at least 0.1 ETH)");
      return;
    }

    // Select operation
    const operations = [
      "Add Native Liquidity",
      "Remove Native Liquidity",
      "View Native Positions",
    ];
    const opIndex = readlineSync.keyInSelect(
      operations,
      "\nWhat would you like to do?"
    );

    if (opIndex === -1) {
      logger.info("Cancelled");
      return;
    }

    if (opIndex === 0) {
      // Add Native Liquidity
      logger.header("\n💧 Add Native ETH Liquidity");

      // Get available tokens (excluding WCAMP since we're using native)
      const tokens = NATIVE_PAIR_TOKENS;

      // Get token balances
      logger.info("\n📊 Available tokens to pair with native ETH:");
      const tokenInfos: TokenInfo[] = [];

      for (const token of tokens) {
        const info = await getTokenInfo(
          publicClient,
          token.address as Address,
          account.address
        );
        tokenInfos.push(info);
        logger.info(
          `${info.symbol}: ${formatUnits(info.balance, info.decimals)}`
        );
      }

      // Select token to pair with native ETH
      const tokenSymbols = tokenInfos.map((t) => t.symbol);
      const tokenIndex = readlineSync.keyInSelect(
        tokenSymbols,
        "\nSelect token to pair with native ETH:"
      );

      if (tokenIndex === -1) {
        logger.info("Cancelled");
        return;
      }

      const selectedToken = tokenInfos[tokenIndex];
      logger.success(
        `\n✅ Selected pair: ETH (native) / ${selectedToken.symbol}`
      );

      // Check if pair exists
      const pairInfo = await getPairInfo(publicClient, selectedToken.address);

      let optimalTokenAmount: bigint | null = null;

      if (pairInfo) {
        logger.info(`\n📊 Pool exists with reserves:`);
        logger.info(`  ETH: ${formatUnits(pairInfo.reserveWCAMP, 18)}`);
        logger.info(
          `  ${selectedToken.symbol}: ${formatUnits(
            pairInfo.reserveToken,
            selectedToken.decimals
          )}`
        );
        logger.info(`  LP Supply: ${formatUnits(pairInfo.totalSupply, 18)}`);
      } else {
        logger.warn("⚠️ This will create a new pool");
      }

      // Get amount of native ETH to add
      const maxNativeAmount = formatUnits(
        nativeBalance - parseUnits("0.01", 18),
        18
      ); // Keep some for gas
      const nativeAmountInput = readlineSync.question(
        `\nEnter amount of native ETH to add (max: ${maxNativeAmount}): `
      );

      if (!nativeAmountInput || isNaN(Number(nativeAmountInput))) {
        logger.error("Invalid amount");
        return;
      }

      const nativeAmount = parseUnits(nativeAmountInput, 18);

      if (nativeAmount > nativeBalance - parseUnits("0.01", 18)) {
        logger.error("Insufficient native balance (need to keep some for gas)");
        return;
      }

      // Calculate optimal token amount
      let tokenAmount: bigint;

      if (pairInfo) {
        // Calculate optimal amount based on reserves
        optimalTokenAmount = await publicClient.readContract({
          address: contracts.V2_ROUTER,
          abi: V2_ROUTER_ABI,
          functionName: "quote",
          args: [nativeAmount, pairInfo.reserveWCAMP, pairInfo.reserveToken],
        });

        tokenAmount = optimalTokenAmount;
        logger.info(
          `\n📊 Optimal ${selectedToken.symbol} amount: ${formatUnits(
            tokenAmount,
            selectedToken.decimals
          )}`
        );

        if (tokenAmount > selectedToken.balance) {
          logger.error(`Insufficient ${selectedToken.symbol} balance`);
          logger.info(
            `Need: ${formatUnits(tokenAmount, selectedToken.decimals)} ${
              selectedToken.symbol
            }`
          );
          logger.info(
            `Have: ${formatUnits(
              selectedToken.balance,
              selectedToken.decimals
            )} ${selectedToken.symbol}`
          );
          return;
        }
      } else {
        // New pair - ask for token amount
        const maxTokenAmount = formatUnits(
          selectedToken.balance,
          selectedToken.decimals
        );
        const tokenAmountInput = readlineSync.question(
          `Enter amount of ${selectedToken.symbol} to add (max: ${maxTokenAmount}): `
        );

        if (!tokenAmountInput || isNaN(Number(tokenAmountInput))) {
          logger.error("Invalid amount");
          return;
        }

        tokenAmount = parseUnits(tokenAmountInput, selectedToken.decimals);

        if (tokenAmount > selectedToken.balance) {
          logger.error("Insufficient balance");
          return;
        }
      }

      // Set slippage tolerance (0.5%)
      const slippageTolerance = 50n; // 0.5%
      const nativeAmountMin =
        (nativeAmount * (10000n - slippageTolerance)) / 10000n;
      const tokenAmountMin =
        (tokenAmount * (10000n - slippageTolerance)) / 10000n;

      logger.info("\n📝 Transaction Summary:");
      logger.info(`  Native ETH: ${formatUnits(nativeAmount, 18)}`);
      logger.info(
        `  ${selectedToken.symbol}: ${formatUnits(
          tokenAmount,
          selectedToken.decimals
        )}`
      );
      logger.info(`  Slippage: 0.5%`);
      logger.info(`  Min ETH: ${formatUnits(nativeAmountMin, 18)}`);
      logger.info(
        `  Min ${selectedToken.symbol}: ${formatUnits(
          tokenAmountMin,
          selectedToken.decimals
        )}`
      );

      const confirm = readlineSync.keyInYNStrict(
        "\nProceed with adding liquidity?"
      );
      if (!confirm) {
        logger.info("Cancelled");
        return;
      }

      // Approve token with waiting period
      logger.info("\n🔐 Approving token...");
      await approveTokenWithWait(
        walletClient,
        publicClient,
        selectedToken.address,
        contracts.V2_ROUTER as Address,
        tokenAmount,
        selectedToken.symbol,
        3000 // 3 second wait after approval
      );

      // Add liquidity with native ETH
      logger.info("\n💧 Adding liquidity with native ETH...");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

      const txHash = await walletClient.writeContract({
        address: contracts.V2_ROUTER as Address,
        abi: V2_ROUTER_ABI,
        functionName: "addLiquidityETH",
        args: [
          selectedToken.address,
          tokenAmount,
          tokenAmountMin,
          nativeAmountMin,
          account.address,
          deadline,
        ],
        value: nativeAmount,
      });

      logger.info(`Transaction sent: ${txHash}`);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status === "success") {
        logger.success("✅ Native liquidity added successfully!");

        // Get LP token balance
        const newPairInfo = await getPairInfo(
          publicClient,
          selectedToken.address
        );

        if (newPairInfo) {
          const lpBalance = await publicClient.readContract({
            address: newPairInfo.pairAddress,
            abi: V2_PAIR_ABI,
            functionName: "balanceOf",
            args: [account.address],
          });

          logger.success(
            `\n🎉 LP Tokens received: ${formatUnits(lpBalance, 18)}`
          );
          logger.info(`LP Token address: ${newPairInfo.pairAddress}`);

          // Calculate pool share
          const poolShare = (lpBalance * 10000n) / newPairInfo.totalSupply;
          logger.info(`Your pool share: ${Number(poolShare) / 100}%`);
        }

        logger.info(`Gas used: ${receipt.gasUsed}`);
      } else {
        logger.error("❌ Transaction failed");
      }
    } else if (opIndex === 1) {
      // Remove Native Liquidity
      logger.header("\n💧 Remove Native ETH Liquidity");

      // Find pairs with native ETH
      const tokens = NATIVE_PAIR_TOKENS;

      const positions = [];

      for (const token of tokens) {
        const tokenInfo = await getTokenInfo(
          publicClient,
          token.address as Address,
          account.address
        );

        const pairInfo = await getPairInfo(
          publicClient,
          token.address as Address
        );

        if (pairInfo) {
          const lpBalance = await publicClient.readContract({
            address: pairInfo.pairAddress,
            abi: V2_PAIR_ABI,
            functionName: "balanceOf",
            args: [account.address],
          });

          if (lpBalance > 0n) {
            const poolShare =
              Number((lpBalance * 10000n) / pairInfo.totalSupply) / 100;
            const campAmount =
              (pairInfo.reserveWCAMP * lpBalance) / pairInfo.totalSupply;
            const tokenAmount =
              (pairInfo.reserveToken * lpBalance) / pairInfo.totalSupply;

            positions.push({
              token: tokenInfo,
              pairAddress: pairInfo.pairAddress,
              lpBalance,
              poolShare,
              campAmount,
              tokenAmount,
            });
          }
        }
      }

      if (positions.length === 0) {
        logger.warn("No native ETH liquidity positions found");
        return;
      }

      // Display positions
      logger.success(
        `\n📊 Found ${positions.length} native ETH position(s):\n`
      );
      positions.forEach((pos, index) => {
        logger.info(`[${index}] ETH/${pos.token.symbol}`);
        logger.info(`    LP Balance: ${formatUnits(pos.lpBalance, 18)}`);
        logger.info(`    Pool Share: ${pos.poolShare.toFixed(4)}%`);
        logger.info(`    ETH: ${formatUnits(pos.campAmount, 18)}`);
        logger.info(
          `    ${pos.token.symbol}: ${formatUnits(
            pos.tokenAmount,
            pos.token.decimals
          )}`
        );
        logger.divider();
      });

      // Select position
      const posIndex = readlineSync.keyInSelect(
        positions.map((p) => `ETH/${p.token.symbol}`),
        "\nSelect position to remove:"
      );

      if (posIndex === -1) {
        logger.info("Cancelled");
        return;
      }

      const selectedPosition = positions[posIndex];

      // Select percentage to remove
      const percentageOptions = ["25%", "50%", "75%", "100% (Max)"];
      const percentageIndex = readlineSync.keyInSelect(
        percentageOptions,
        "\nHow much liquidity to remove?"
      );

      if (percentageIndex === -1) {
        logger.info("Cancelled");
        return;
      }

      const percentages = [25, 50, 75, 100];
      const removalPercentage = percentages[percentageIndex];
      const lpAmountToRemove =
        (selectedPosition.lpBalance * BigInt(removalPercentage)) / 100n;

      // Calculate expected amounts
      const expectedCAMP =
        (selectedPosition.campAmount * BigInt(removalPercentage)) / 100n;
      const expectedToken =
        (selectedPosition.tokenAmount * BigInt(removalPercentage)) / 100n;

      // Set slippage
      const slippageTolerance = 50n; // 0.5%
      const campMin = (expectedCAMP * (10000n - slippageTolerance)) / 10000n;
      const tokenMin = (expectedToken * (10000n - slippageTolerance)) / 10000n;

      logger.info("\n📝 Removal Summary:");
      logger.info(
        `  LP Tokens to remove: ${formatUnits(
          lpAmountToRemove,
          18
        )} (${removalPercentage}%)`
      );
      logger.info(`  Expected ETH: ${formatUnits(expectedCAMP, 18)}`);
      logger.info(
        `  Expected ${selectedPosition.token.symbol}: ${formatUnits(
          expectedToken,
          selectedPosition.token.decimals
        )}`
      );
      logger.info(`  Min ETH: ${formatUnits(campMin, 18)}`);
      logger.info(
        `  Min ${selectedPosition.token.symbol}: ${formatUnits(
          tokenMin,
          selectedPosition.token.decimals
        )}`
      );

      const confirm = readlineSync.keyInYNStrict(
        "\nProceed with removing liquidity?"
      );
      if (!confirm) {
        logger.info("Cancelled");
        return;
      }

      // Approve LP tokens with waiting period
      logger.info("\n🔐 Approving LP tokens...");
      await approveTokenWithWait(
        walletClient,
        publicClient,
        selectedPosition.pairAddress,
        contracts.V2_ROUTER as Address,
        lpAmountToRemove,
        "LP Token",
        3000 // 3 second wait after approval
      );

      // Remove liquidity and receive native ETH
      logger.info("\n💧 Removing liquidity to receive native ETH...");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

      const txHash = await walletClient.writeContract({
        address: contracts.V2_ROUTER as Address,
        abi: V2_ROUTER_ABI,
        functionName: "removeLiquidityETH",
        args: [
          selectedPosition.token.address,
          lpAmountToRemove,
          tokenMin,
          campMin,
          account.address,
          deadline,
        ],
      });

      logger.info(`Transaction sent: ${txHash}`);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status === "success") {
        logger.success("✅ Liquidity removed successfully!");
        logger.success("Native ETH and tokens received!");

        // Check remaining LP balance
        const remainingLP = await publicClient.readContract({
          address: selectedPosition.pairAddress,
          abi: V2_PAIR_ABI,
          functionName: "balanceOf",
          args: [account.address],
        });

        if (remainingLP > 0n) {
          logger.info(
            `\n📊 Remaining LP tokens: ${formatUnits(remainingLP, 18)}`
          );
        } else {
          logger.info("\n✨ All liquidity removed from this pool");
        }

        logger.info(`Gas used: ${receipt.gasUsed}`);
      } else {
        logger.error("❌ Transaction failed");
      }
    } else {
      // View Native Positions
      logger.header("\n📊 Native ETH Liquidity Positions");

      const tokens = NATIVE_PAIR_TOKENS;

      const positions = [];

      for (const token of tokens) {
        const tokenInfo = await getTokenInfo(
          publicClient,
          token.address as Address,
          account.address
        );

        const pairInfo = await getPairInfo(
          publicClient,
          token.address as Address
        );

        if (pairInfo) {
          const lpBalance = await publicClient.readContract({
            address: pairInfo.pairAddress,
            abi: V2_PAIR_ABI,
            functionName: "balanceOf",
            args: [account.address],
          });

          if (lpBalance > 0n) {
            const poolShare =
              Number((lpBalance * 10000n) / pairInfo.totalSupply) / 100;
            const campAmount =
              (pairInfo.reserveWCAMP * lpBalance) / pairInfo.totalSupply;
            const tokenAmount =
              (pairInfo.reserveToken * lpBalance) / pairInfo.totalSupply;

            positions.push({
              token: tokenInfo,
              pairAddress: pairInfo.pairAddress,
              lpBalance,
              poolShare,
              campAmount,
              tokenAmount,
              totalReserveCAMP: pairInfo.reserveWCAMP,
              totalReserveToken: pairInfo.reserveToken,
            });
          }
        }
      }

      if (positions.length === 0) {
        logger.warn("No native ETH liquidity positions found");
        logger.info("\nAdd liquidity using: npm run liquidity:native");
      } else {
        logger.success(
          `\n✅ Found ${positions.length} native ETH position(s):\n`
        );

        let totalCAMPLocked = 0n;

        positions.forEach((pos, index) => {
          logger.info(`[${index}] ETH/${pos.token.symbol}`);
          logger.info(`    LP Balance: ${formatUnits(pos.lpBalance, 18)}`);
          logger.info(`    Pool Share: ${pos.poolShare.toFixed(4)}%`);
          logger.info(`    Your liquidity:`);
          logger.info(`      ETH: ${formatUnits(pos.campAmount, 18)}`);
          logger.info(
            `      ${pos.token.symbol}: ${formatUnits(
              pos.tokenAmount,
              pos.token.decimals
            )}`
          );
          logger.info(`    Pool reserves:`);
          logger.info(`      ETH: ${formatUnits(pos.totalReserveCAMP, 18)}`);
          logger.info(
            `      ${pos.token.symbol}: ${formatUnits(
              pos.totalReserveToken,
              pos.token.decimals
            )}`
          );
          logger.info(`    Pair address: ${pos.pairAddress}`);
          logger.divider();

          totalCAMPLocked += pos.campAmount;
        });

        logger.success(
          `\n📈 Total ETH in liquidity: ${formatUnits(totalCAMPLocked, 18)}`
        );
      }
    }
  } catch (error: any) {
    logger.error("Error:", error?.message || error);
    console.error("Full error:", error);
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error?.message || error);
  process.exit(1);
});
