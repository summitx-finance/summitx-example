import {
  ChainId,
  FACTORY_ADDRESS_MAP as FACTORY_ADDRESS_MAP_SDK,
  WNATIVE,
} from "@fusionx-finance/sdk";
import {
  MIXED_ROUTE_QUOTER_ADDRESSES as MIXED_ROUTE_QUOTER_ADDRESSES_SDK,
  SWAP_ROUTER_ADDRESSES as SMART_ROUTER_ADDRESSES_SDK,
  ROUTER_ADDRESS as V2_ROUTER_ADDRESS_SDK,
  V3_QUOTER_ADDRESSES as V3_QUOTER_ADDRESSES_SDK,
} from "@fusionx-finance/smart-router/evm";
import { Token } from "@fusionx-finance/swap-sdk-core";
import { USDC } from "@fusionx-finance/tokens";
import type { Address, PublicClient } from "viem";
import { createPublicClient, http } from "viem";

// Base testnet configuration
export const MANTLE_SEPOLIA = ChainId.MANTLE_SEPOLIA_TESTNET;

export const mantleSepoliaTestnet = {
  id: 5003,
  name: "Mantle Sepolia",
  network: "Mantle Sepolia Testnet",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
    public: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
  },
  blockExplorers: {
    etherscan: {
      name: "Explorer",
      url: "https://explorer.sepolia.mantle.xyz",
    },
    default: {
      name: "Explorer",
      url: "https://explorer.sepolia.mantle.xyz",
    },
  },
  contracts: {
    multicall3: {
      address: "0x5C02724f13BD649317D397B9213212D1c73393A8" as `0x${string}`,
      blockCreated: 2638,
    },
  },
};

// RPC endpoints for Base testnet
export const RPC_ENDPOINTS = ["https://rpc.sepolia.mantle.xyz"];

// Smart router addresses
export const SMART_ROUTER_ADDRESS =
  SMART_ROUTER_ADDRESSES_SDK[ChainId.MANTLE_SEPOLIA_TESTNET];
export const V2_ROUTER_ADDRESS =
  V2_ROUTER_ADDRESS_SDK[ChainId.MANTLE_SEPOLIA_TESTNET];
export const V2_FACTORY_ADDRESS =
  FACTORY_ADDRESS_MAP_SDK[ChainId.MANTLE_SEPOLIA_TESTNET];
export const V3_QUOTER_ADDRESS =
  V3_QUOTER_ADDRESSES_SDK[ChainId.MANTLE_SEPOLIA_TESTNET];
export const MIXED_ROUTE_QUOTER_ADDRESS =
  MIXED_ROUTE_QUOTER_ADDRESSES_SDK[ChainId.MANTLE_SEPOLIA_TESTNET];

// Common tokens on Base testnet
export const WMANTLE_ADDRESS = WNATIVE[ChainId.MANTLE_SEPOLIA_TESTNET]
  .address as Address;
export const USDC_ADDRESS = USDC[ChainId.MANTLE_SEPOLIA_TESTNET]
  .address as Address;
export const USDT_ADDRESS = "0xa9b72cCC9968aFeC98A96239B5AA48d828e8D827";
export const DAI_ADDRESS = "0xc92747b1e4Bd5F89BBB66bAE657268a5F4c4850C";
export const WBTC_ADDRESS = "0x0000000000000000000000000000000000000000";
export const WETH_ADDRESS = "0x0000000000000000000000000000000000000000";

// Token instances
export const baseMantleTestnetTokens = {
  wnative: new Token(
    MANTLE_SEPOLIA,
    WMANTLE_ADDRESS, // WMANTLE and WETH share the same address on Base Mantle testnet
    18,
    "WMANTLE",
    "Wrapped MANTLE",
    ""
  ),
  weth: new Token(
    MANTLE_SEPOLIA,
    WETH_ADDRESS,
    18,
    "WETH",
    "Wrapped Ether",
    "https://ethereum.org"
  ),
  wbtc: new Token(
    MANTLE_SEPOLIA,
    WBTC_ADDRESS,
    18,
    "WBTC",
    "Wrapped Bitcoin",
    "https://bitcoin.org"
  ),
  usdc: new Token(
    MANTLE_SEPOLIA,
    USDC_ADDRESS,
    6,
    "USDC",
    "USD Coin",
    "https://www.circle.com/usdc"
  ),
  usdt: new Token(
    MANTLE_SEPOLIA,
    USDT_ADDRESS,
    6,
    "USDT",
    "Tether USD",
    "https://tether.to"
  ),
  dai: new Token(
    MANTLE_SEPOLIA,
    DAI_ADDRESS,
    18,
    "DAI",
    "Dai Stablecoin",
    "https://dai.io"
  ),
};

// Export alias for backward compatibility
export const baseTestnetTokens = baseMantleTestnetTokens;

// Base tokens for routing
export const BASE_TOKENS = [
  baseMantleTestnetTokens.wnative,
  baseMantleTestnetTokens.usdc,
  baseMantleTestnetTokens.usdt,
  baseMantleTestnetTokens.dai,
  baseMantleTestnetTokens.wbtc,
  baseMantleTestnetTokens.weth,
];

// Multicall configuration
export const MULTICALL_CONFIG = {
  defaultConfig: {
    gasLimitPerCall: 1_000_000,
  },
  gasErrorFailureOverride: {
    gasLimitPerCall: 2_000_000,
  },
  successRateFailureOverrides: {
    gasLimitPerCall: 2_000_000,
  },
};

// Create public client for RPC calls
export function createBaseTestnetClient(rpcUrl?: string): PublicClient {
  return createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http(rpcUrl || RPC_ENDPOINTS[0]),
    batch: {
      multicall: true,
    },
  }) as PublicClient;
}

// Get all RPC clients for fallback
export function createAllRpcClients(): PublicClient[] {
  return RPC_ENDPOINTS.map((url) => createBaseTestnetClient(url));
}
