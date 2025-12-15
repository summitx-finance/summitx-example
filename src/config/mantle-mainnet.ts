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

export const mantleMainnet = {
  id: 5000,
  name: "Mantle",
  network: "Mantle",
  nativeCurrency: {
    decimals: 18,
    name: "MNT",
    symbol: "MNT",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.mantle.xyz"],
    },
    public: {
      http: ["https://rpc.mantle.xyz"],
    },
  },
  blockExplorers: {
    etherscan: {
      name: "Mantle Explorer",
      url: "https://explorer.mantle.xyz",
    },
    default: {
      name: "Mantle Explorer",
      url: "https://explorer.mantle.xyz",
    },
  },
  contracts: {
    multicall3: {
      address: "0xb55cc6B5B402437b66c13c0CEd0EF367aa7c26da" as `0x${string}`,
      blockCreated: 304717,
    },
  },
};

// Mantle mainnet configuration
export const MANTLE_MAINNET = ChainId.MANTLE;

// RPC endpoints for Mantle mainnet
export const RPC_ENDPOINTS = ["https://rpc.mantle.xyz"];

// Smart router addresses - THESE NEED TO BE UPDATED WITH ACTUAL MAINNET ADDRESSES
export const SMART_ROUTER_ADDRESS = SMART_ROUTER_ADDRESSES_SDK[ChainId.MANTLE];
export const V2_ROUTER_ADDRESS = V2_ROUTER_ADDRESS_SDK[ChainId.MANTLE];
export const V2_FACTORY_ADDRESS = FACTORY_ADDRESS_MAP_SDK[ChainId.MANTLE];
export const V3_QUOTER_ADDRESS = V3_QUOTER_ADDRESSES_SDK[ChainId.MANTLE];
export const MIXED_ROUTE_QUOTER_ADDRESS =
  MIXED_ROUTE_QUOTER_ADDRESSES_SDK[ChainId.MANTLE];

// Common tokens on Mantle mainnet - THESE NEED TO BE UPDATED WITH ACTUAL MAINNET ADDRESSES
export const WMANTLE_ADDRESS = WNATIVE[ChainId.MANTLE].address as Address;
export const USDC_ADDRESS = USDC[ChainId.MANTLE].address as Address;

// Token instances
export const mantleMainnetTokens = {
  wnative: new Token(
    MANTLE_MAINNET,
    WMANTLE_ADDRESS,
    18,
    "WMANTLE",
    "Wrapped MANTLE",
    ""
  ),
  // weth: new Token(
  //   MANTLE_MAINNET,
  //   WETH_ADDRESS,
  //   18,
  //   "WETH",
  //   "Wrapped Ether",
  //   "https://ethereum.org"
  // ),
  // wbtc: new Token(
  //   MANTLE_MAINNET,
  //   WBTC_ADDRESS,
  //   18,
  //   "WBTC",
  //   "Wrapped Bitcoin",
  //   "https://bitcoin.org"
  // ),
  usdc: new Token(
    MANTLE_MAINNET,
    USDC_ADDRESS,
    6,
    "USDC",
    "USD Coin",
    "https://www.circle.com/usdc"
  ),
  // usdt: new Token(
  //   MANTLE_MAINNET,
  //   USDT_ADDRESS,
  //   6,
  //   "USDT",
  //   "Tether USD",
  //   "https://tether.to"
  // ),
  // dai: new Token(
  //   MANTLE_MAINNET,
  //   DAI_ADDRESS,
  //   18,
  //   "DAI",
  //   "Dai Stablecoin",
  //   "https://dai.io"
  // ),
};

// Base tokens for routing
export const BASE_TOKENS = [
  mantleMainnetTokens.wnative,
  mantleMainnetTokens.usdc,
  // mantleMainnetTokens.usdt,
  // mantleMainnetTokens.dai,
  // mantleMainnetTokens.wbtc,
  // mantleMainnetTokens.weth,
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
export function createMantleMainnetClient(rpcUrl?: string): PublicClient {
  return createPublicClient({
    chain: mantleMainnet,
    transport: http(rpcUrl || RPC_ENDPOINTS[0]),
    batch: {
      multicall: true,
    },
  }) as PublicClient;
}

// Get all RPC clients for fallback
export function createAllRpcClients(): PublicClient[] {
  return RPC_ENDPOINTS.map((url) => createMantleMainnetClient(url));
}
