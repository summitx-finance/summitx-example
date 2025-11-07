/**
 * Referral System - Core Functions
 *
 * This file contains core referral system utility functions.
 * Use referral-system-testnet.ts or referral-system-mainnet.ts for examples.
 *
 * Core Functions:
 * - getReferrerCode() - Get your referral code
 * - getAppliedReferralCode() - Get the referral code you've applied
 * - getReferralInfo() - Get referral code and expiry
 * - registerReferralCode() - Register a new referral code
 * - applyReferralCode() - Apply a referral code to your wallet
 * - getReferralCodeInfo() - Get full code information (volume, fees, etc.)
 *
 * Code Information:
 * - getPayoutAddress() - Get payout address for a code
 * - getReferredVolume() - Get referred volume for a code
 * - getAccumulatedFees() - Get accumulated fees for a code
 * - getCustomDuration() - Get custom duration for a code
 *
 * Escrow Functions:
 * - getEscrowInfo() - Get escrow information for a code
 * - escrowCode() - Escrow a code for another address
 * - claimFromEscrow() - Claim a code from escrow
 * - transferEscrowedCode() - Transfer an escrowed code
 *
 * Fee Management:
 * - withdrawFees() - Withdraw fees for a referral code
 * - withdrawEscrowedFees() - Withdraw escrowed fees for multiple codes
 * - setPayoutAddress() - Set payout address for a code
 *
 * Configuration:
 * - getContractConfig() - Get all contract configuration values
 *
 * Utility Functions:
 * - referralCodeToString() - Convert bytes32 to string
 * - stringToReferralCode() - Convert string to bytes32
 */

import type { Address, Hash, Hex, PublicClient, WalletClient } from "viem";
import { hexToString, stringToHex } from "viem";
import { REFERRAL_HANDLER_V2_ABI } from "../config/abis";
import { waitForTransaction } from "../utils/transaction-helpers";

/**
 * Referral code information interface
 */
export interface ReferralCodeInfo {
  volume: bigint;
  customDuration: bigint;
  accumulatedFees: bigint;
  payoutAddress: Address;
  isAvailable: boolean;
}

/**
 * Referral information interface
 */
export interface ReferralInfo {
  code: Hex;
  expiry: bigint;
}

/**
 * Escrow information interface
 */
export interface EscrowInfo {
  escrowedFor: Address;
  escrowDeadline: bigint;
}

/**
 * Convert bytes32 referral code to string
 */
export function referralCodeToString(code: Hex): string {
  return hexToString(code).split("\x00").join("");
}

/**
 * Convert string referral code to bytes32
 */
export function stringToReferralCode(code: string): `0x${string}` {
  return stringToHex(code, { size: 32 });
}

/**
 * Get referral code for a referrer address
 */
export async function getReferrerCode(
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  referrerAddress: Address
): Promise<Hex | null> {
  try {
    const code = await publicClient.readContract({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "referrerToCode",
      args: [referrerAddress],
    });

    const emptyCode =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (code === emptyCode) {
      return null;
    }

    return code as Hex;
  } catch (error: any) {
    throw new Error(`Failed to get referrer code: ${error?.message || error}`);
  }
}

/**
 * Get the referral code that a user has applied
 */
export async function getAppliedReferralCode(
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  userAddress: Address
): Promise<Hex | null> {
  try {
    const code = await publicClient.readContract({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "getReferralCode",
      args: [userAddress],
    });

    const emptyCode =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    const defaultCode =
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    if (code === emptyCode || code === defaultCode) {
      return null;
    }

    return code as Hex;
  } catch (error: any) {
    throw new Error(
      `Failed to get applied referral code: ${error?.message || error}`
    );
  }
}

/**
 * Check referral code availability and get code information
 */
export async function getReferralCodeInfo(
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: Hex
): Promise<ReferralCodeInfo> {
  try {
    const result = await publicClient.readContract({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "codes",
      args: [code],
    });

    const [volume, customDuration, accumulatedFees, payoutAddress] = result as [
      bigint,
      bigint,
      bigint,
      Address
    ];

    const emptyAddress =
      "0x0000000000000000000000000000000000000000" as Address;
    const isAvailable = payoutAddress === emptyAddress;

    return {
      volume,
      customDuration,
      accumulatedFees,
      payoutAddress,
      isAvailable,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to get referral code info: ${error?.message || error}`
    );
  }
}

/**
 * Register a new referral code
 */
export async function registerReferralCode(
  walletClient: WalletClient,
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: string
): Promise<Hash> {
  try {
    const codeBytes = stringToReferralCode(code);

    // Check if code is already taken
    const codeInfo = await getReferralCodeInfo(
      publicClient,
      referralHandlerAddress,
      codeBytes
    );

    if (!codeInfo.isAvailable) {
      throw new Error("Referral code is already taken");
    }

    // Register the code
    const txHash = (await (walletClient.writeContract as any)({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "registerReferralCode",
      args: [codeBytes],
    })) as Hash;

    await waitForTransaction(publicClient, txHash, "register referral code");

    return txHash;
  } catch (error: any) {
    const errorMessage = error?.message || error?.shortMessage || String(error);

    if (errorMessage.includes("CodeAlreadyRegistered")) {
      throw new Error("Referral code is already registered");
    } else if (errorMessage.includes("InvalidCode")) {
      throw new Error("Invalid referral code format");
    } else if (errorMessage.includes("already taken")) {
      throw error;
    }

    throw new Error(`Failed to register referral code: ${errorMessage}`);
  }
}

/**
 * Apply a referral code to your wallet
 */
export async function applyReferralCode(
  walletClient: WalletClient,
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  userAddress: Address,
  code: string
): Promise<Hash> {
  try {
    // Check if user already has a referral code applied
    const existingCode = await getAppliedReferralCode(
      publicClient,
      referralHandlerAddress,
      userAddress
    );

    console.log("existingCode", existingCode, code);

    if (existingCode) {
      const existingCodeString = referralCodeToString(existingCode);
      throw new Error(
        `You already have a referral code applied: ${existingCodeString}`
      );
    }

    const codeBytes = stringToReferralCode(code);

    // Apply the referral code
    const txHash = (await (walletClient.writeContract as any)({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "setReferral",
      args: [userAddress, codeBytes],
    })) as Hash;

    await waitForTransaction(publicClient, txHash, "apply referral code");

    return txHash;
  } catch (error: any) {
    const errorMessage = error?.message || error?.shortMessage || String(error);

    if (
      errorMessage.includes("Invalid Code") ||
      errorMessage.includes("revert") ||
      errorMessage.includes("Invalid")
    ) {
      throw new Error("Invalid referral code");
    }

    throw new Error(`Failed to apply referral code: ${errorMessage}`);
  }
}

/**
 * Get referral information (code and expiry) for a user
 */
export async function getReferralInfo(
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  userAddress: Address
): Promise<ReferralInfo | null> {
  try {
    const result = await publicClient.readContract({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "getReferralInfo",
      args: [userAddress],
    });

    const resultTuple = result as unknown as [Hex, bigint];
    const code = resultTuple[0];
    const expiry = resultTuple[1];

    const emptyCode =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    const defaultCode =
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    if (code === emptyCode || code === defaultCode) {
      return null;
    }

    return { code, expiry };
  } catch (error: any) {
    throw new Error(`Failed to get referral info: ${error?.message || error}`);
  }
}

/**
 * Get payout address for a referral code
 */
export async function getPayoutAddress(
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: Hex
): Promise<Address> {
  try {
    return await publicClient.readContract({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "payoutAddress",
      args: [code],
    });
  } catch (error: any) {
    throw new Error(`Failed to get payout address: ${error?.message || error}`);
  }
}

/**
 * Get referred volume for a referral code
 */
export async function getReferredVolume(
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: Hex
): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "referredVolume",
      args: [code],
    });
  } catch (error: any) {
    throw new Error(
      `Failed to get referred volume: ${error?.message || error}`
    );
  }
}

/**
 * Get accumulated fees for a referral code
 */
export async function getAccumulatedFees(
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: Hex
): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "accumulatedFees",
      args: [code],
    });
  } catch (error: any) {
    throw new Error(
      `Failed to get accumulated fees: ${error?.message || error}`
    );
  }
}

/**
 * Get custom duration for a referral code
 */
export async function getCustomDuration(
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: Hex
): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "customDuration",
      args: [code],
    });
  } catch (error: any) {
    throw new Error(
      `Failed to get custom duration: ${error?.message || error}`
    );
  }
}

/**
 * Get escrow information for a referral code
 */
export async function getEscrowInfo(
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: Hex
): Promise<EscrowInfo | null> {
  try {
    const result = await publicClient.readContract({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "escrowedCodes",
      args: [code],
    });

    const [escrowedFor, escrowDeadline] = result as [Address, bigint];

    const emptyAddress =
      "0x0000000000000000000000000000000000000000" as Address;

    if (escrowedFor === emptyAddress) {
      return null;
    }

    return { escrowedFor, escrowDeadline };
  } catch (error: any) {
    throw new Error(`Failed to get escrow info: ${error?.message || error}`);
  }
}

/**
 * Escrow a referral code for another address
 */
export async function escrowCode(
  walletClient: WalletClient,
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: string,
  escrowFor: Address
): Promise<Hash> {
  try {
    const codeBytes = stringToReferralCode(code);

    const txHash = (await (walletClient.writeContract as any)({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "escrowCode",
      args: [codeBytes, escrowFor],
    })) as Hash;

    await waitForTransaction(publicClient, txHash, "escrow code");

    return txHash;
  } catch (error: any) {
    throw new Error(
      `Failed to escrow code: ${error?.message || error?.shortMessage || error}`
    );
  }
}

/**
 * Claim a code from escrow
 */
export async function claimFromEscrow(
  walletClient: WalletClient,
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: string,
  escrowFee: bigint
): Promise<Hash> {
  try {
    const codeBytes = stringToReferralCode(code);

    const txHash = (await (walletClient.writeContract as any)({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "claimFromEscrow",
      args: [codeBytes],
      value: escrowFee,
    })) as Hash;

    await waitForTransaction(publicClient, txHash, "claim from escrow");

    return txHash;
  } catch (error: any) {
    throw new Error(
      `Failed to claim from escrow: ${
        error?.message || error?.shortMessage || error
      }`
    );
  }
}

/**
 * Transfer an escrowed code to another recipient
 */
export async function transferEscrowedCode(
  walletClient: WalletClient,
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: string,
  recipient: Address
): Promise<Hash> {
  try {
    const codeBytes = stringToReferralCode(code);

    const txHash = (await (walletClient.writeContract as any)({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "transferEscrowedCode",
      args: [codeBytes, recipient],
    })) as Hash;

    await waitForTransaction(publicClient, txHash, "transfer escrowed code");

    return txHash;
  } catch (error: any) {
    throw new Error(
      `Failed to transfer escrowed code: ${
        error?.message || error?.shortMessage || error
      }`
    );
  }
}

/**
 * Withdraw fees for a referral code
 */
export async function withdrawFees(
  walletClient: WalletClient,
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: string
): Promise<{ txHash: Hash; amount: bigint }> {
  try {
    const codeBytes = stringToReferralCode(code);

    const txHash = (await (walletClient.writeContract as any)({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "withdrawFees",
      args: [codeBytes],
    })) as Hash;

    await waitForTransaction(publicClient, txHash, "withdraw fees");

    const amount = 0n; // Would need to parse from events

    return { txHash, amount };
  } catch (error: any) {
    throw new Error(
      `Failed to withdraw fees: ${
        error?.message || error?.shortMessage || error
      }`
    );
  }
}

/**
 * Withdraw escrowed fees for multiple codes
 */
export async function withdrawEscrowedFees(
  walletClient: WalletClient,
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  codes: string[]
): Promise<{ txHash: Hash; amount: bigint }> {
  try {
    const codeBytes = codes.map((code) => stringToReferralCode(code));

    const txHash = (await (walletClient.writeContract as any)({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "withdrawEscrowedFees",
      args: [codeBytes],
    })) as Hash;

    await waitForTransaction(publicClient, txHash, "withdraw escrowed fees");

    const amount = 0n; // Would need to parse from events

    return { txHash, amount };
  } catch (error: any) {
    throw new Error(
      `Failed to withdraw escrowed fees: ${
        error?.message || error?.shortMessage || error
      }`
    );
  }
}

/**
 * Set payout address for a referral code
 */
export async function setPayoutAddress(
  walletClient: WalletClient,
  publicClient: PublicClient,
  referralHandlerAddress: Address,
  code: string,
  payoutAddress: Address
): Promise<Hash> {
  try {
    const codeBytes = stringToReferralCode(code);

    const txHash = (await (walletClient.writeContract as any)({
      address: referralHandlerAddress,
      abi: REFERRAL_HANDLER_V2_ABI,
      functionName: "setPayoutAddress",
      args: [codeBytes, payoutAddress],
    })) as Hash;

    await waitForTransaction(publicClient, txHash, "set payout address");

    return txHash;
  } catch (error: any) {
    throw new Error(
      `Failed to set payout address: ${
        error?.message || error?.shortMessage || error
      }`
    );
  }
}

/**
 * Get contract configuration values
 */
export async function getContractConfig(
  publicClient: PublicClient,
  referralHandlerAddress: Address
): Promise<{
  defaultDuration: bigint;
  escrowDuration: bigint;
  escrowFee: bigint;
  tier1ReferralFraction: bigint;
  tier2ReferralFraction: bigint;
  tier2Volume: bigint;
  cutoffVolume: bigint;
  treasury: Address;
  operator: Address;
}> {
  try {
    const [
      defaultDuration,
      escrowDuration,
      escrowFee,
      tier1ReferralFraction,
      tier2ReferralFraction,
      tier2Volume,
      cutoffVolume,
      treasury,
      operator,
    ] = await Promise.all([
      publicClient.readContract({
        address: referralHandlerAddress,
        abi: REFERRAL_HANDLER_V2_ABI,
        functionName: "defaultDuration",
      }),
      publicClient.readContract({
        address: referralHandlerAddress,
        abi: REFERRAL_HANDLER_V2_ABI,
        functionName: "escrowDuration",
      }),
      publicClient.readContract({
        address: referralHandlerAddress,
        abi: REFERRAL_HANDLER_V2_ABI,
        functionName: "escrowFee",
      }),
      publicClient.readContract({
        address: referralHandlerAddress,
        abi: REFERRAL_HANDLER_V2_ABI,
        functionName: "tier1ReferralFraction",
      }),
      publicClient.readContract({
        address: referralHandlerAddress,
        abi: REFERRAL_HANDLER_V2_ABI,
        functionName: "tier2ReferralFraction",
      }),
      publicClient.readContract({
        address: referralHandlerAddress,
        abi: REFERRAL_HANDLER_V2_ABI,
        functionName: "tier2Volume",
      }),
      publicClient.readContract({
        address: referralHandlerAddress,
        abi: REFERRAL_HANDLER_V2_ABI,
        functionName: "cutoffVolume",
      }),
      publicClient.readContract({
        address: referralHandlerAddress,
        abi: REFERRAL_HANDLER_V2_ABI,
        functionName: "treasury",
      }),
      publicClient.readContract({
        address: referralHandlerAddress,
        abi: REFERRAL_HANDLER_V2_ABI,
        functionName: "operator",
      }),
    ]);

    return {
      defaultDuration: defaultDuration as bigint,
      escrowDuration: escrowDuration as bigint,
      escrowFee: escrowFee as bigint,
      tier1ReferralFraction: tier1ReferralFraction as bigint,
      tier2ReferralFraction: tier2ReferralFraction as bigint,
      tier2Volume: tier2Volume as bigint,
      cutoffVolume: cutoffVolume as bigint,
      treasury: treasury as Address,
      operator: operator as Address,
    };
  } catch (error: any) {
    throw new Error(
      `Failed to get contract config: ${error?.message || error}`
    );
  }
}
