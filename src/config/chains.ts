/**
 * Unified chain configuration with ChainMap pattern
 * Supports both Camp Testnet and Camp Mainnet
 */

import { ChainId } from "@summitx/chains";
import type { Address } from "viem";
import {
  DAI_ADDRESS as TESTNET_DAI,
  MIXED_ROUTE_QUOTER_ADDRESS as TESTNET_MIXED_QUOTER,
  SMART_ROUTER_ADDRESS as TESTNET_SMART_ROUTER,
  USDC_ADDRESS as TESTNET_USDC,
  USDT_ADDRESS as TESTNET_USDT,
  V2_FACTORY_ADDRESS as TESTNET_V2_FACTORY,
  V2_ROUTER_ADDRESS as TESTNET_V2_ROUTER,
  V3_QUOTER_ADDRESS as TESTNET_V3_QUOTER,
  WBTC_ADDRESS as TESTNET_WBTC,
  WCAMP_ADDRESS as TESTNET_WCAMP,
  WETH_ADDRESS as TESTNET_WETH,
  basecampTestnet
} from "./base-testnet";
import {
  MIXED_ROUTE_QUOTER_ADDRESS as MAINNET_MIXED_QUOTER,
  SMART_ROUTER_ADDRESS as MAINNET_SMART_ROUTER,
  USDC_ADDRESS as MAINNET_USDC,
  V2_FACTORY_ADDRESS as MAINNET_V2_FACTORY,
  V2_ROUTER_ADDRESS as MAINNET_V2_ROUTER,
  V3_QUOTER_ADDRESS as MAINNET_V3_QUOTER,
  WCAMP_ADDRESS as MAINNET_WCAMP,
  campMainnet,
} from "./camp-mainnet";

import {
  DAI_ADDRESS as MEGAETH_TESTNET_DAI,
  MIXED_ROUTE_QUOTER_ADDRESS as MEGAETH_TESTNET_MIXED_QUOTER,
  SMART_ROUTER_ADDRESS as MEGAETH_TESTNET_SMART_ROUTER,
  USDC_ADDRESS as MEGAETH_TESTNET_USDC,
  USDT_ADDRESS as MEGAETH_TESTNET_USDT,
  V2_FACTORY_ADDRESS as MEGAETH_TESTNET_V2_FACTORY,
  V2_ROUTER_ADDRESS as MEGAETH_TESTNET_V2_ROUTER,
  V3_QUOTER_ADDRESS as MEGAETH_TESTNET_V3_QUOTER,
  WETH_ADDRESS as MEGAETH_TESTNET_WETH,
  megaethTestnet,
} from "./megaeth-testnet";

// Type for chain-specific addresses
export type ChainMap<T> = {
  [ChainId.BASECAMP]: T;
  [ChainId.CAMP]: T;
  [ChainId.MEGAETH_TESTNET]: T;
};

// WCAMP addresses
export const WCAMP_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_WCAMP as Address,
  [ChainId.CAMP]: MAINNET_WCAMP as Address,
  [ChainId.MEGAETH_TESTNET]: MEGAETH_TESTNET_WETH as Address
};

// DEX Router addresses
export const SMART_ROUTER_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_SMART_ROUTER as Address,
  [ChainId.CAMP]: MAINNET_SMART_ROUTER as Address,
  [ChainId.MEGAETH_TESTNET]:MEGAETH_TESTNET_SMART_ROUTER as Address,
};

export const V2_ROUTER_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_V2_ROUTER as Address,
  [ChainId.CAMP]: MAINNET_V2_ROUTER as Address,
  [ChainId.MEGAETH_TESTNET]: MEGAETH_TESTNET_V2_ROUTER as Address,
};

// Launchpad addresses
// TODO: Update with actual Launchpad addresses
export const LAUNCHPAD_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]:
    "0x8cF89848e90e4f8F0A958BC9fb2Adb12A2cdC00e" as Address, // Placeholder
  [ChainId.CAMP]: "0xaf433dAB9E231b3c213a05209699ce0bD9Ff3e75" as Address, // Placeholder
  [ChainId.MEGAETH_TESTNET]: "0x84A21641a4dE6B4A2c068A671D4B372ADE76FbBE" as Address, // Placeholder
};

// ReferralRouter addresses (Launchpad)
// TODO: Update with actual ReferralRouter addresses
export const REFERRAL_ROUTER_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]:
    "0x5FBFA3c89bB668F2F8a761Cb16088A696E56205f" as Address, // Placeholder
  [ChainId.CAMP]: "0x4cf695b263b9b7D8695A761Ee9A666f7B37D3b28" as Address, // Placeholder
  [ChainId.MEGAETH_TESTNET]: "0xfBb953Da347710b9C726491068461Aa66bADBD67" as Address, // Placeholder
};

// AccessRegistry addresses (Launchpad Access Control)
// TODO: Update with actual AccessRegistry addresses
export const ACCESS_REGISTRY_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]:
    "0xD955DC13aE93656e494537d0caC191F4049Af363" as Address, // Placeholder
  [ChainId.CAMP]: "0xCA487F7745149cf3bE0781F0E180c313B08123ea" as Address, // Placeholder
  [ChainId.MEGAETH_TESTNET]: "0xBd2372B6b1Cc8E5703a3c544d838d4EDC31EE7AC" as Address, // Placeholder
};

// ReferralHandlerV2 addresses (Referral System)
// TODO: Update with actual ReferralHandlerV2 addresses
export const REFERRAL_HANDLER_V2_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]:
    "0x66d06304b79612864ABF9AB66BEF5d1617305a7A" as Address, // TODO: Add actual address
  [ChainId.CAMP]: "0x5EdF801128cf1F3091576E907E3ca6052b6D0677" as Address, // TODO: Add actual address
  [ChainId.MEGAETH_TESTNET]: "0x39F599132065Dd3dEa86103b7E897Db0D14e2696" as Address, // TODO: Add actual address
};

// Factory addresses
export const V2_FACTORY_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_V2_FACTORY as Address,
  [ChainId.CAMP]: MAINNET_V2_FACTORY as Address,
  [ChainId.MEGAETH_TESTNET]: MEGAETH_TESTNET_V2_FACTORY as Address,
};

export const V3_FACTORY_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: "0x56e72729b46fc7a5C18C3333ACDA52cB57936022",
  [ChainId.CAMP]: "0xBa08235b05d06A8A27822faCF3BaBeF4f972BF7d",
  [ChainId.MEGAETH_TESTNET]: "0xc4a65C3e58D8bF9a5fef40eeB59e5c47507D6C72",
};

// Position managers
export const NFT_POSITION_MANAGER_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: "0x3D1b19d5cEa9770A0e62296c4CCC7658ccdf127C",
  [ChainId.CAMP]: "0x1D96b819DE6AE9Bab504Fb16E5273FCFA9A0Ff18",
  [ChainId.MEGAETH_TESTNET]: "0x25019e864c19d56bC4315958E79e2EE18B5Ea17c",
};

// Quoter addresses
export const QUOTER_V2_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_V3_QUOTER as Address,
  [ChainId.CAMP]: MAINNET_V3_QUOTER as Address,
  [ChainId.MEGAETH_TESTNET]: MEGAETH_TESTNET_V3_QUOTER as Address,
};

export const MIXED_ROUTE_QUOTER_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_MIXED_QUOTER as Address,
  [ChainId.CAMP]: MAINNET_MIXED_QUOTER as Address,
  [ChainId.MEGAETH_TESTNET]: MEGAETH_TESTNET_MIXED_QUOTER as Address,
};

// Multicall addresses
export const MULTICALL3_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: megaethTestnet.contracts.multicall3.address,
  [ChainId.CAMP]: campMainnet.contracts.multicall3.address,
  [ChainId.MEGAETH_TESTNET]: megaethTestnet.contracts.multicall3.address,
};

// Token addresses
export const USDC_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_USDC as Address,
  [ChainId.CAMP]: MAINNET_USDC as Address,
  [ChainId.MEGAETH_TESTNET]: MEGAETH_TESTNET_USDC as Address,
};

export const USDT_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_USDT as Address,
  [ChainId.CAMP]: TESTNET_USDT as Address, // Using testnet address as placeholder for mainnet
  [ChainId.MEGAETH_TESTNET]: MEGAETH_TESTNET_USDT as Address,

};

export const DAI_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_DAI as Address,
  [ChainId.CAMP]: TESTNET_DAI as Address, // Using testnet address as placeholder for mainnet
  [ChainId.MEGAETH_TESTNET]: MEGAETH_TESTNET_DAI as Address, // Using testnet address as placeholder for mainnet
};

export const WBTC_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_WBTC as Address,
  [ChainId.CAMP]: TESTNET_WBTC as Address, // Using testnet address as placeholder for mainnet
  [ChainId.MEGAETH_TESTNET]: TESTNET_WBTC as Address, // Using testnet address as placeholder for mainnet
};

export const WETH_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP]: TESTNET_WETH as Address,
  [ChainId.CAMP]: TESTNET_WETH as Address, // Using testnet address as placeholder for mainnet
  [ChainId.MEGAETH_TESTNET]: MEGAETH_TESTNET_WETH as Address,
};

// RPC URLs
export const RPC_URLS: ChainMap<string[]> = {
  [ChainId.BASECAMP]: basecampTestnet.rpcUrls.default.http,
  [ChainId.CAMP]: campMainnet.rpcUrls.default.http,
  [ChainId.MEGAETH_TESTNET]: megaethTestnet.rpcUrls.default.http,
};

// Block explorers
export const BLOCK_EXPLORERS: ChainMap<{ name: string; url: string }> = {
  [ChainId.BASECAMP]: megaethTestnet.blockExplorers.default,
  [ChainId.CAMP]: campMainnet.blockExplorers.default,
  [ChainId.MEGAETH_TESTNET]:megaethTestnet.blockExplorers.default,
};

// Network names
export const NETWORK_NAMES: ChainMap<string> = {
  [ChainId.BASECAMP]: "Base Camp Testnet",
  [ChainId.CAMP]: "Camp Mainnet",
  [ChainId.MEGAETH_TESTNET]:"MegaEth Testnet"
};

// Fee tiers for V3 pools (in basis points)
export const V3_FEE_TIERS = {
  LOWEST: 100, // 0.01%
  LOW: 500, // 0.05%
  MEDIUM: 3000, // 0.3%
  HIGH: 10000, // 1%
} as const;

// Tick spacings for V3 fee tiers
export const V3_TICK_SPACINGS = {
  [V3_FEE_TIERS.LOWEST]: 1,
  [V3_FEE_TIERS.LOW]: 10,
  [V3_FEE_TIERS.MEDIUM]: 60,
  [V3_FEE_TIERS.HIGH]: 200,
} as const;

// Transaction defaults
export const TX_DEFAULTS = {
  slippageTolerance: 50n, // 0.5% in basis points
  deadlineMinutes: 20,
  gasBuffer: "0.01", // Reserve 0.01 native token for gas
} as const;

// Helper function to get deadline
export function getDeadline(
  minutes: number = TX_DEFAULTS.deadlineMinutes
): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
}

// Helper function to apply slippage
export function applySlippage(
  amount: bigint,
  slippageBps: bigint = TX_DEFAULTS.slippageTolerance
): bigint {
  return (amount * (10000n - slippageBps)) / 10000n;
}

// Helper function to get contracts for a specific chain
export function getContractsForChain(
  chainId: ChainId.BASECAMP | ChainId.CAMP | ChainId.MEGAETH_TESTNET
) {
  return {
    // Tokens
    WCAMP: WCAMP_ADDRESSES[chainId],
    WETH:WETH_ADDRESSES[chainId],

    // Routers
    SMART_ROUTER: SMART_ROUTER_ADDRESSES[chainId],
    V2_ROUTER: V2_ROUTER_ADDRESSES[chainId],

    // Factories
    V2_FACTORY: V2_FACTORY_ADDRESSES[chainId],
    V3_FACTORY: V3_FACTORY_ADDRESSES[chainId],

    // Position Management
    NFT_POSITION_MANAGER: NFT_POSITION_MANAGER_ADDRESSES[chainId],

    // Quoters
    QUOTER_V2: QUOTER_V2_ADDRESSES[chainId],
    MIXED_ROUTE_QUOTER: MIXED_ROUTE_QUOTER_ADDRESSES[chainId],

    // Launchpad
    LAUNCHPAD: LAUNCHPAD_ADDRESSES[chainId],
    REFERRAL_ROUTER: REFERRAL_ROUTER_ADDRESSES[chainId],
    ACCESS_REGISTRY: ACCESS_REGISTRY_ADDRESSES[chainId],
    REFERRAL_HANDLER_V2: REFERRAL_HANDLER_V2_ADDRESSES[chainId],

    // Utilities
    MULTICALL3: MULTICALL3_ADDRESSES[chainId],
  };
}

// Export default chain configurations
export const CHAIN_CONFIGS = {
  [ChainId.BASECAMP]: {
    id: ChainId.BASECAMP,
    name: NETWORK_NAMES[ChainId.BASECAMP],
    network: "Basecamp",
    nativeCurrency: {
      decimals: 18,
      name: "CAMP",
      symbol: "CAMP",
    },
    rpcUrls: {
      default: {
        http: RPC_URLS[ChainId.BASECAMP],
      },
      public: {
        http: RPC_URLS[ChainId.BASECAMP],
      },
    },
    blockExplorers: {
      default: BLOCK_EXPLORERS[ChainId.BASECAMP],
    },
    contracts: {
      multicall3: basecampTestnet.contracts.multicall3,
    },
  },
  [ChainId.CAMP]: {
    id: ChainId.CAMP,
    name: NETWORK_NAMES[ChainId.CAMP],
    network: "Camp",
    nativeCurrency: {
      decimals: 18,
      name: "CAMP",
      symbol: "CAMP",
    },
    rpcUrls: {
      default: {
        http: RPC_URLS[ChainId.CAMP],
      },
      public: {
        http: RPC_URLS[ChainId.CAMP],
      },
    },
    blockExplorers: {
      default: BLOCK_EXPLORERS[ChainId.CAMP],
    },
    contracts: {
      multicall3: campMainnet.contracts.multicall3,
    },
  },
  [ChainId.MEGAETH_TESTNET]: {
    id: ChainId.MEGAETH_TESTNET,
    name: NETWORK_NAMES[ChainId.MEGAETH_TESTNET],
    network: "MegaETH",
    nativeCurrency: {
      decimals: 18,
      name: "ETH",
      symbol: "ETH",
    },
    rpcUrls: {
      default: {
        http: RPC_URLS[ChainId.MEGAETH_TESTNET],
      },
      public: {
        http: RPC_URLS[ChainId.MEGAETH_TESTNET],
      },
    },
    blockExplorers: {
      default: BLOCK_EXPLORERS[ChainId.MEGAETH_TESTNET],
    },
    contracts: {
      multicall3: megaethTestnet.contracts.multicall3,
    },
  },
};
