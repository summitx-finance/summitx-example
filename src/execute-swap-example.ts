/**
 * SummitX Smart Router Swap Example
 * 
 * This example demonstrates how to:
 * 1. Get optimal swap routes using TokenQuoter
 * 2. Execute swaps on-chain using SwapRouter
 * 
 * IMPORTANT: Set your private key in .env file before running
 */

import { config } from "dotenv"
import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  parseUnits, 
  formatUnits, 
  type Address, 
  type Hash, 
  type Hex 
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { TradeType, Percent } from "@summitx/swap-sdk-core"
import { SwapRouter, type MethodParameters } from "@summitx/smart-router/evm"
import { TokenQuoter } from "./quoter/token-quoter"
import { baseCampTestnetTokens } from "./config/base-testnet"
import { logger } from "./utils/logger"

// Load environment variables
config()

// ============================================================================
// CONFIGURATION
// ============================================================================

// Chain configuration for Base Camp Testnet
const CHAIN_ID = 123420001114
const CHAIN_CONFIG = {
  id: CHAIN_ID,
  name: 'Base Camp Testnet',
  network: 'basecamp',
  nativeCurrency: { name: 'CAMP', symbol: 'CAMP', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-campnetwork.xyz'] },
    public: { http: ['https://rpc-campnetwork.xyz'] }
  }
}

// Smart Router address on Base Camp Testnet
const SMART_ROUTER_ADDRESS = "0x197b7c9fC5c8AeA84Ab2909Bf94f24370539722D" as Address

// Swap parameters - Modify these for your swap
const SWAP_CONFIG = {
  inputToken: baseCampTestnetTokens.usdc,      // Token to swap from
  outputToken: baseCampTestnetTokens.t12eth,   // Token to swap to
  inputAmount: "10",                           // Amount to swap (in token units)
  slippagePercent: 1.0,                        // Slippage tolerance (1% = 1.0)
}

// ============================================================================
// ERC20 ABI - Required for token approvals
// ============================================================================

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
] as const

// ============================================================================
// MAIN SWAP FUNCTION
// ============================================================================

async function executeSwap() {
  logger.header("SummitX Smart Router Swap Example")

  // ========================================
  // STEP 1: Setup Wallet and Clients
  // ========================================
  
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey) {
    logger.error("Please set PRIVATE_KEY in your .env file")
    logger.info("Example: PRIVATE_KEY=0x1234...abcd")
    process.exit(1)
  }

  // Create wallet from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  
  // Create clients for interacting with the blockchain
  const walletClient = createWalletClient({
    account,
    chain: CHAIN_CONFIG as any,
    transport: http("https://rpc-campnetwork.xyz/8708df38d9cc4bb39ac813ae005be495"),
  })

  const publicClient = createPublicClient({
    chain: CHAIN_CONFIG as any,
    transport: http("https://rpc-campnetwork.xyz/8708df38d9cc4bb39ac813ae005be495"),
  })

  logger.success(`Wallet connected: ${account.address}`)

  // ========================================
  // STEP 2: Check Token Balances
  // ========================================
  
  logger.header("Step 2: Checking Token Balances")
  
  const inputTokenBalance = await publicClient.readContract({
    address: SWAP_CONFIG.inputToken.address as Address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  })

  const inputBalanceFormatted = formatUnits(inputTokenBalance, SWAP_CONFIG.inputToken.decimals)
  logger.info(`${SWAP_CONFIG.inputToken.symbol} Balance: ${inputBalanceFormatted}`)

  // Check if user has enough tokens
  const requiredAmount = parseUnits(SWAP_CONFIG.inputAmount, SWAP_CONFIG.inputToken.decimals)
  if (inputTokenBalance < requiredAmount) {
    logger.error(`Insufficient ${SWAP_CONFIG.inputToken.symbol} balance`)
    logger.info(`Required: ${SWAP_CONFIG.inputAmount} ${SWAP_CONFIG.inputToken.symbol}`)
    logger.info(`Available: ${inputBalanceFormatted} ${SWAP_CONFIG.inputToken.symbol}`)
    return
  }

  // ========================================
  // STEP 3: Get Swap Quote
  // ========================================
  
  logger.header("Step 3: Getting Swap Quote")

  // Initialize the token quoter
  const quoter = new TokenQuoter({
    rpcUrl: "https://rpc-campnetwork.xyz/8708df38d9cc4bb39ac813ae005be495",
    slippageTolerance: SWAP_CONFIG.slippagePercent,
    maxHops: 3,        // Maximum number of hops in a route
    maxSplits: 3,      // Maximum number of split routes
  })

  try {
    // Get the optimal swap route
    const quote = await quoter.getQuote(
      SWAP_CONFIG.inputToken,
      SWAP_CONFIG.outputToken,
      SWAP_CONFIG.inputAmount,
      TradeType.EXACT_INPUT,
      false // Don't adjust for gas
    )

    if (!quote) {
      logger.error("No swap route found")
      logger.info("This might happen if there's no liquidity in the pools")
      return
    }

    // Display quote details
    logger.success("Quote received:", {
      input: `${quote.inputAmount} ${quote.inputToken.symbol}`,
      expectedOutput: `${quote.outputAmount} ${quote.outputToken.symbol}`,
      minimumOutput: `${quote.minimumReceived} ${quote.outputToken.symbol}`,
      priceImpact: quote.priceImpact,
      route: Array.isArray(quote.route) ? quote.route : [quote.route],
    })

    // ========================================
    // STEP 4: Prepare Swap Transaction
    // ========================================
    
    logger.header("Step 4: Preparing Swap Transaction")

    // Check if we have the raw trade data
    if (!quote.rawTrade) {
      logger.error("Raw trade data not available")
      return
    }

    // Prepare swap options
    const slippageTolerancePercent = new Percent(
      Math.floor(SWAP_CONFIG.slippagePercent * 100), 
      10000
    )
    
    const swapOptions = {
      slippageTolerance: slippageTolerancePercent,
      recipient: account.address,
      deadlineOrPreviousBlockhash: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    }

    // Build swap transaction using SwapRouter
    const methodParameters: MethodParameters = SwapRouter.swapCallParameters(
      quote.rawTrade,
      swapOptions
    )

    logger.info("Swap transaction prepared")
    logger.info(`Router address: ${SMART_ROUTER_ADDRESS}`)
    logger.info(`Transaction value: ${methodParameters.value} wei`)

    // ========================================
    // STEP 5: Handle Token Approval
    // ========================================
    
    logger.header("Step 5: Checking Token Approval")

    const inputTokenAddress = SWAP_CONFIG.inputToken.address as Address

    // Check current allowance
    const currentAllowance = await publicClient.readContract({
      address: inputTokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [account.address, SMART_ROUTER_ADDRESS],
    })

    logger.info(`Current allowance: ${formatUnits(currentAllowance, SWAP_CONFIG.inputToken.decimals)} ${SWAP_CONFIG.inputToken.symbol}`)

    // Approve if needed
    if (currentAllowance < requiredAmount) {
      logger.info("Approval needed. Sending approval transaction...")
      
      const approvalTx = await walletClient.writeContract({
        address: inputTokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [SMART_ROUTER_ADDRESS, requiredAmount],
      })

      logger.info(`Approval transaction sent: ${approvalTx}`)
      logger.info("Waiting for confirmation...")
      
      const approvalReceipt = await publicClient.waitForTransactionReceipt({
        hash: approvalTx,
      })
      
      logger.success(`Approval confirmed in block ${approvalReceipt.blockNumber}`)
    } else {
      logger.success("Token already approved")
    }

    // ========================================
    // STEP 6: Execute the Swap
    // ========================================
    
    logger.header("Step 6: Executing Swap")
    
    // Safety check - give user time to cancel
    logger.warn("Sending swap transaction in 3 seconds... (Press Ctrl+C to cancel)")
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Send the swap transaction
    const swapTx = await walletClient.sendTransaction({
      to: SMART_ROUTER_ADDRESS,
      data: methodParameters.calldata as Hex,
      value: BigInt(methodParameters.value),
    })

    logger.info(`Swap transaction sent: ${swapTx}`)
    logger.info("Waiting for confirmation...")

    // Wait for transaction confirmation
    const swapReceipt = await publicClient.waitForTransactionReceipt({
      hash: swapTx,
    })

    // ========================================
    // STEP 7: Verify Results
    // ========================================
    
    logger.header("Step 7: Swap Results")

    if (swapReceipt.status === 'success') {
      logger.success("Swap completed successfully! 🎉")
      
      // Check final balances
      const [finalInputBalance, finalOutputBalance] = await Promise.all([
        publicClient.readContract({
          address: SWAP_CONFIG.inputToken.address as Address,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [account.address],
        }),
        publicClient.readContract({
          address: SWAP_CONFIG.outputToken.address as Address,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [account.address],
        }),
      ])

      const inputSpent = formatUnits(
        inputTokenBalance - finalInputBalance, 
        SWAP_CONFIG.inputToken.decimals
      )
      const outputReceived = formatUnits(
        finalOutputBalance, 
        SWAP_CONFIG.outputToken.decimals
      )

      logger.success("Transaction details:", {
        transactionHash: swapReceipt.transactionHash,
        blockNumber: swapReceipt.blockNumber.toString(),
        gasUsed: swapReceipt.gasUsed.toString(),
        spent: `${inputSpent} ${SWAP_CONFIG.inputToken.symbol}`,
        received: `${outputReceived} ${SWAP_CONFIG.outputToken.symbol}`,
      })
    } else {
      logger.error("Swap transaction failed")
      logger.info("Check the transaction on the block explorer for more details")
    }

  } catch (error) {
    logger.error("Swap failed:", error)
  }
}

// ============================================================================
// RUN THE EXAMPLE
// ============================================================================

// Run the swap
executeSwap().catch((error) => {
  logger.error("Unexpected error:", error)
  process.exit(1)
})

// ============================================================================
// CUSTOMIZATION GUIDE
// ============================================================================

/*
To customize this example for your needs:

1. Change tokens:
   - Modify SWAP_CONFIG.inputToken and SWAP_CONFIG.outputToken
   - Available tokens: baseCampTestnetTokens.usdc, .t12eth, .wcamp, .summit, .usdt

2. Change swap amount:
   - Modify SWAP_CONFIG.inputAmount

3. Adjust slippage tolerance:
   - Modify SWAP_CONFIG.slippagePercent (1.0 = 1%, 0.5 = 0.5%)

4. Use different network:
   - Update CHAIN_CONFIG and SMART_ROUTER_ADDRESS
   - Update RPC URLs in client configuration

5. Advanced options:
   - Modify quoter maxHops and maxSplits for route discovery
   - Adjust deadline in swapOptions (default: 5 minutes)
*/