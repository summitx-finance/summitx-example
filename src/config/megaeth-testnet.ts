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

// Base testnet configuration
export const MEGAETH_TESTNET = ChainId.MEGAETH_TESTNET;

export const megaethTestnet = {
  id: 6343,
  name: "MegaEth",
  network: "MegaEth",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://timothy.megaeth.com/mafia/rpc/n0m3q6w9e2r5t8y1u4i7o0p3a6s9d2f5g8h1j4k7"],
    },
    public: {
      http: ["https://timothy.megaeth.com/mafia/rpc/n0m3q6w9e2r5t8y1u4i7o0p3a6s9d2f5g8h1j4k7"],
    },
  },
  blockExplorers: {
    etherscan: {
      name: "MegaEth Testnet Explorer",
      url: "https://megaeth-testnet-v2.blockscout.com",
    },
    default: {
      name: "MegaEth Testnet Explorer",
      url: "https://megaeth-testnet-v2.blockscout.com",
    },
  },
  contracts: {
    multicall3: {
      address: "0xC09AB8D97a34a868017dE50a7044E903F665ee05" as `0x${string}`,
      blockCreated: 4554455,
    },
  },
};

// RPC endpoints for Base testnet
export const RPC_ENDPOINTS = ["https://timothy.megaeth.com/mafia/rpc/n0m3q6w9e2r5t8y1u4i7o0p3a6s9d2f5g8h1j4k7"];

// Smart router addresses
export const SMART_ROUTER_ADDRESS =
  SMART_ROUTER_ADDRESSES_SDK[ChainId.MEGAETH_TESTNET];
// Note: V2_ROUTER_ADDRESS_SDK incorrectly returns SmartRouter, using hardcoded correct value
export const V2_ROUTER_ADDRESS = "0x5408923A1dD32Ce653fc4633d4E96362AB6fdf9b";
export const V2_FACTORY_ADDRESS =
  FACTORY_ADDRESS_MAP_SDK[ChainId.MEGAETH_TESTNET];
export const V3_QUOTER_ADDRESS =
  V3_QUOTER_ADDRESSES_SDK[ChainId.MEGAETH_TESTNET];
export const MIXED_ROUTE_QUOTER_ADDRESS =
  MIXED_ROUTE_QUOTER_ADDRESSES_SDK[ChainId.MEGAETH_TESTNET];

// Common tokens on Base testnet
export const WETH_ADDRESS="0x4200000000000000000000000000000000000006";
export const USDC_ADDRESS = USDC[ChainId.MEGAETH_TESTNET].address as Address;
export const USDT_ADDRESS = "0x2c477F41696b2d3E02860b8095184719c03F03B1";
export const DAI_ADDRESS = "0xbb02c374D5d7CdABa7d866482BD828F639d634BD";
// export const WBTC_ADDRESS = "0x587aF234D373C752a6F6E9eD6c4Ce871e7528BCF";

// Token instances
export const megaEthTestnetTokens = {
  weth: new Token(
    MEGAETH_TESTNET,
    WETH_ADDRESS,
    18,
    "WETH",
    "Wrapped Ether",
    "https://ethereum.org"
  ),
  usdc: new Token(
    MEGAETH_TESTNET,
    USDC_ADDRESS,
    6,
    "USDC",
    "USD Coin",
    "https://www.circle.com/usdc"
  ),
  usdt: new Token(
    MEGAETH_TESTNET,
    USDT_ADDRESS,
    6,
    "USDT",
    "Tether USD",
    "https://tether.to"
  ),
  dai: new Token(
    MEGAETH_TESTNET,
    DAI_ADDRESS,
    18,
    "DAI",
    "Dai Stablecoin",
    "https://dai.io"
  ),
};

export const megaethTestnetLaunchpadToken = {
  MEOW: new Token(
    MEGAETH_TESTNET,
    "0x41d718d84375f17fa4c36481ad71c1a3df6019ec",
    18,
    "MEOW",
    "MEOW"
  ),
};

// Export alias for backward compatibility
export const megaTestnetTokens = megaEthTestnetTokens;

// Base tokens for routing
export const BASE_TOKENS = [
  megaEthTestnetTokens.usdc,
  megaEthTestnetTokens.usdt,
  megaEthTestnetTokens.dai,
  megaEthTestnetTokens.weth,
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
    chain: megaethTestnet,
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
