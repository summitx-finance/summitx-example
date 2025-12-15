/**
 * Launchpad trade utility functions
 * Based on the frontend useTokenTrade hook implementation
 */

import { ChainId } from "@fusionx-finance/sdk";
import type { Address, Hex, PublicClient } from "viem";
import { keccak256, parseUnits, toHex } from "viem";
import { LAUNCHPAD_ABI } from "../config/abis";
import { INETEGRATED_API } from "../config/urls";

/**
 * Launchpad quote result interface
 */
export interface LaunchpadQuoteResult {
  amountInEth: bigint;
  amountOutToken: bigint;
  amountInToken: bigint;
  amountOutEth: bigint;
}

/**
 * Get quote type for launchpad quote function
 * @param actionType - "buy" or "sell"
 * @param selectedSymbol - The symbol of the token being used (native token symbol for native trades)
 * @param nativeTokenSymbol - The native token symbol (e.g., "MANTLE", "ETH")
 * @returns Quote type: 0 = buy with ETH, 1 = buy with tokens, 2 = sell for ETH, 3 = sell for tokens
 */
export function getQuoteType(
  actionType: string,
  selectedSymbol: string,
  nativeTokenSymbol: string = "MANTLE"
): number {
  if (actionType === "buy") {
    if (selectedSymbol === nativeTokenSymbol) {
      return 2;
    } else {
      return 0;
    }
  } else {
    if (selectedSymbol === nativeTokenSymbol) {
      return 3;
    } else {
      return 1;
    }
  }
}

/**
 * Get the function name for launchpad trade based on action type and selected symbol
 * @param actionType - "buy" or "sell"
 * @param selectedSymbol - The symbol of the token being used (native token symbol for native trades)
 * @param nativeTokenSymbol - The native token symbol (e.g., "MANTLE", "ETH")
 */
export function getFunctionName(
  actionType: string,
  selectedSymbol: string,
  nativeTokenSymbol: string = "MANTLE"
): string {
  if (actionType === "buy") {
    if (selectedSymbol === nativeTokenSymbol) return "buyExactEth";
    else return "buyExactTokens";
  } else {
    if (selectedSymbol === nativeTokenSymbol) return "sellExactEth";
    else return "sellExactTokens";
  }
}

/**
 * Get launchpad quote from Launchpad contract
 * Based on the reference implementation from useTokenQuote hook
 * @param publicClient - Viem public client
 * @param launchpadAddress - Launchpad contract address
 * @param tokenAddress - Launchpad token address (the token being bought/sold)
 * @param amount - Amount as string (will be parsed to 18 decimals)
 * @param actionType - "buy" or "sell"
 * @param selectedSymbol - The symbol of the token being used
 * @param nativeTokenSymbol - The native token symbol
 * @returns Launchpad quote result
 */
export async function getLaunchpadQuote(
  publicClient: PublicClient,
  launchpadAddress: Address,
  tokenAddress: Address,
  amount: string,
  actionType: string,
  selectedSymbol: string,
  nativeTokenSymbol: string = "MANTLE"
): Promise<LaunchpadQuoteResult> {
  const quoteType = getQuoteType(actionType, selectedSymbol, nativeTokenSymbol);
  const amountInWei = parseUnits(amount, 18); // Launchpad uses 18 decimals for amount

  // Validate inputs
  if (amountInWei === 0n) {
    throw new Error("Amount cannot be zero");
  }

  console.log("tokenAddress", tokenAddress);
  console.log("amountInWei", amountInWei);
  console.log("quoteType", quoteType);

  try {
    const result = await publicClient.readContract({
      address: launchpadAddress,
      abi: LAUNCHPAD_ABI,
      functionName: "quote",
      args: [tokenAddress, amountInWei, quoteType],
    });

    console.log("quoteresult", result);

    return {
      amountInEth: result[0] as bigint,
      amountInToken: result[1] as bigint,
      amountOutEth: result[2] as bigint,
      amountOutToken: result[3] as bigint,
    };
  } catch (error: any) {
    // Enhanced error handling for contract reverts
    const errorMessage = error?.message || error?.shortMessage || String(error);
    const errorData = error?.data || error?.cause?.data;

    // Check for specific error selector
    if (
      errorMessage?.includes("0xd08ec497") ||
      errorData?.includes("0xd08ec497")
    ) {
      throw new Error(
        `Launchpad quote failed: Invalid token or quote parameters. ` +
          `Token: ${tokenAddress}, Amount: ${amount}, QuoteType: ${quoteType} (${actionType} with ${selectedSymbol}). ` +
          `This error typically indicates the token is not supported by the launchpad or the quote parameters are invalid.`
      );
    }

    // Re-throw with more context
    throw new Error(
      `Failed to get launchpad quote: ${errorMessage}. ` +
        `Parameters: token=${tokenAddress}, amount=${amount}, quoteType=${quoteType} (${actionType} with ${selectedSymbol})`
    );
  }
}

/**
 * Get arguments for launchpad trade function
 * Based on the reference implementation from useTokenTrade hook
 * @param actionType - "buy" or "sell"
 * @param selectedSymbol - The symbol of the token being used
 * @param tokenAddress - The address of the token being traded (output token for buy/sell with ETH, input token for buy/sell with tokens)
 * @param amount - The amount to trade (as a number)
 * @param quote - The launchpad quote result
 * @param referralCode - The referral code (bytes32)
 * @param outputTokenAddress - The output token address (required for buyExactTokens and sellExactTokens)
 */
export const getArgs = (
  actionType: string,
  selectedSymbol: string,
  address: string,
  quote: any,
  code: string,
  nativeTokenSymbol: string = "MANTLE"
) => {
  if (actionType === "buy")
    return [address, quote.amountOutToken.toString(), code];
  else {
    if (selectedSymbol === nativeTokenSymbol)
      return [
        address,
        quote.amountOutEth.toString(),
        quote.amountInToken.toString(),
        code,
      ];
    else
      return [
        address,
        quote.amountInToken.toString(),
        quote.amountOutEth.toString(),
        code,
      ];
  }
};

/**
 * Convert a string to bytes32 format
 * @param str - The string to convert
 */
function stringToBytes32(str: string): `0x${string}` {
  // Pad or truncate to 32 bytes (64 hex characters)
  const hex = Buffer.from(str.slice(0, 32), "utf8")
    .toString("hex")
    .padEnd(64, "0");
  return `0x${hex}` as `0x${string}`;
}

/**
 * Generate leaf hash from access code
 * @param code - The access code string
 * @returns The keccak256 hash of the code as bytes32
 */
export function generateLeaf(code: string): `0x${string}` {
  return keccak256(toHex(code));
}

/**
 * Generate merkle proof from API endpoint
 * @param code - The access code string
 * @param apiUrl - The API endpoint URL for generating proof (optional, can use env var PROOF_API_URL)
 * @returns Array of hex proof values
 */
export async function generateProof(
  code: string,
  chainId: ChainId,
  apiUrl?: string
): Promise<Hex[]> {
  const endpoint =
    INETEGRATED_API[chainId as keyof typeof INETEGRATED_API] ||
    process.env.PROOF_API_URL;

  if (!endpoint) {
    throw new Error(
      "Proof API URL is required. Set PROOF_API_URL environment variable or pass apiUrl parameter."
    );
  }

  try {
    const response = await fetch(endpoint + "/dash/generate-proof", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inviteCode: code }),
    });

    if (!response.ok) {
      throw new Error(
        `Proof API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as unknown;

    console.log(data);

    // Handle different response formats
    if (Array.isArray(data)) {
      return data as Hex[];
    } else if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      if (obj.proof && Array.isArray(obj.proof)) {
        return obj.proof as Hex[];
      } else if (obj.data && Array.isArray(obj.data)) {
        return obj.data as Hex[];
      }
    }

    throw new Error("Invalid proof response format");
  } catch (error: any) {
    if (error.message?.includes("fetch")) {
      throw new Error(`Failed to fetch proof from API: ${error.message}`);
    }
    throw error;
  }
}
