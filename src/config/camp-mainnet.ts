import { ChainId } from "@summitx/chains";
import {
  FACTORY_ADDRESS_MAP as FACTORY_ADDRESS_MAP_SDK,
  WNATIVE,
} from "@summitx/sdk";
import {
  MIXED_ROUTE_QUOTER_ADDRESSES as MIXED_ROUTE_QUOTER_ADDRESSES_SDK,
  SMART_ROUTER_ADDRESSES as SMART_ROUTER_ADDRESSES_SDK,
  V2_ROUTER_ADDRESS as V2_ROUTER_ADDRESS_SDK,
  V3_QUOTER_ADDRESSES as V3_QUOTER_ADDRESSES_SDK,
} from "@summitx/smart-router/evm";
import { Token } from "@summitx/swap-sdk-core";
import { USDC } from "@summitx/tokens";
import type { Address, PublicClient } from "viem";
import { createPublicClient, http } from "viem";

// Camp mainnet configuration
export const CAMP_MAINNET = ChainId.CAMP;

export const campMainnet = {
  id: CAMP_MAINNET,
  name: "Camp Mainnet",
  network: "Camp",
  nativeCurrency: {
    decimals: 18,
    name: "CAMP",
    symbol: "CAMP",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.camp.raas.gelato.cloud"],
    },
    public: {
      http: ["https://rpc.camp.raas.gelato.cloud"],
    },
  },
  blockExplorers: {
    etherscan: {
      name: "Camp Explorer",
      url: "https://camp.cloud.blockscout.com",
    },
    default: {
      name: "Camp Explorer",
      url: "https://camp.cloud.blockscout.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0x9C585cbD20C7770E234e4184b840034395581101" as `0x${string}`,
      blockCreated: 0,
    },
  },
};

// RPC endpoints for Camp mainnet
export const RPC_ENDPOINTS = ["https://rpc.camp.raas.gelato.cloud"];

// Smart router addresses - THESE NEED TO BE UPDATED WITH ACTUAL MAINNET ADDRESSES
export const SMART_ROUTER_ADDRESS =
  SMART_ROUTER_ADDRESSES_SDK[ChainId.CAMP];
export const V2_ROUTER_ADDRESS = V2_ROUTER_ADDRESS_SDK[ChainId.CAMP];
export const V2_FACTORY_ADDRESS = FACTORY_ADDRESS_MAP_SDK[ChainId.CAMP];
export const V3_QUOTER_ADDRESS = V3_QUOTER_ADDRESSES_SDK[ChainId.CAMP];
export const MIXED_ROUTE_QUOTER_ADDRESS =
  MIXED_ROUTE_QUOTER_ADDRESSES_SDK[ChainId.CAMP];

// Common tokens on Camp mainnet - THESE NEED TO BE UPDATED WITH ACTUAL MAINNET ADDRESSES
export const WCAMP_ADDRESS = WNATIVE[ChainId.CAMP].address as Address;
export const USDC_ADDRESS = USDC[ChainId.CAMP].address as Address;

// Token instances
export const campMainnetTokens = {
  wcamp: new Token(
    CAMP_MAINNET,
    WCAMP_ADDRESS,
    18,
    "WCAMP",
    "Wrapped CAMP",
    ""
  ),
  // weth: new Token(
  //   CAMP_MAINNET,
  //   WETH_ADDRESS,
  //   18,
  //   "WETH",
  //   "Wrapped Ether",
  //   "https://ethereum.org"
  // ),
  // wbtc: new Token(
  //   CAMP_MAINNET,
  //   WBTC_ADDRESS,
  //   18,
  //   "WBTC",
  //   "Wrapped Bitcoin",
  //   "https://bitcoin.org"
  // ),
  usdc: new Token(
    CAMP_MAINNET,
    USDC_ADDRESS,
    6,
    "USDC",
    "USD Coin",
    "https://www.circle.com/usdc"
  ),
  // usdt: new Token(
  //   CAMP_MAINNET,
  //   USDT_ADDRESS,
  //   6,
  //   "USDT",
  //   "Tether USD",
  //   "https://tether.to"
  // ),
  // dai: new Token(
  //   CAMP_MAINNET,
  //   DAI_ADDRESS,
  //   18,
  //   "DAI",
  //   "Dai Stablecoin",
  //   "https://dai.io"
  // ),
};

export const campMainnetLaunchpadToken = {
  MIKO: new Token(
    CAMP_MAINNET,
    "0x1e713b273635414a6916cb61fff3e290a373d20f",
    18,
    "MIKO",
    "MIMI AND NEKO",
    ""
  ),
};

// Base tokens for routing
export const BASE_TOKENS = [
  campMainnetTokens.wcamp,
  campMainnetTokens.usdc,
  // campMainnetTokens.usdt,
  // campMainnetTokens.dai,
  // campMainnetTokens.wbtc,
  // campMainnetTokens.weth,
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
export function createCampMainnetClient(rpcUrl?: string): PublicClient {
  return createPublicClient({
    chain: campMainnet,
    transport: http(rpcUrl || RPC_ENDPOINTS[0]),
    batch: {
      multicall: true,
    },
  }) as PublicClient;
}

// Get all RPC clients for fallback
export function createAllRpcClients(): PublicClient[] {
  return RPC_ENDPOINTS.map((url) => createCampMainnetClient(url));
}
