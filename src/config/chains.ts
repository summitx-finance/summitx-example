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
  basecampTestnet,
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

// Type for chain-specific addresses
export type ChainMap<T> = {
  [ChainId.BASECAMP_TESTNET]: T;
  [ChainId.BASECAMP]: T;
};

// WCAMP addresses
export const WCAMP_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_WCAMP as Address,
  [ChainId.BASECAMP]: MAINNET_WCAMP as Address,
};

// DEX Router addresses
export const SMART_ROUTER_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_SMART_ROUTER as Address,
  [ChainId.BASECAMP]: MAINNET_SMART_ROUTER as Address,
};

export const V2_ROUTER_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_V2_ROUTER as Address,
  [ChainId.BASECAMP]: MAINNET_V2_ROUTER as Address,
};

// Factory addresses
export const V2_FACTORY_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_V2_FACTORY as Address,
  [ChainId.BASECAMP]: MAINNET_V2_FACTORY as Address,
};

export const V3_FACTORY_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: "0x56e72729b46fc7a5C18C3333ACDA52cB57936022",
  [ChainId.BASECAMP]: "0xBa08235b05d06A8A27822faCF3BaBeF4f972BF7d",
};

// Position managers
export const NFT_POSITION_MANAGER_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: "0x3D1b19d5cEa9770A0e62296c4CCC7658ccdf127C",
  [ChainId.BASECAMP]: "0x1D96b819DE6AE9Bab504Fb16E5273FCFA9A0Ff18",
};

// Quoter addresses
export const QUOTER_V2_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_V3_QUOTER as Address,
  [ChainId.BASECAMP]: MAINNET_V3_QUOTER as Address,
};

export const MIXED_ROUTE_QUOTER_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_MIXED_QUOTER as Address,
  [ChainId.BASECAMP]: MAINNET_MIXED_QUOTER as Address,
};

// Multicall addresses
export const MULTICALL3_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: basecampTestnet.contracts.multicall3.address,
  [ChainId.BASECAMP]: campMainnet.contracts.multicall3.address,
};

// Token addresses
export const USDC_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_USDC as Address,
  [ChainId.BASECAMP]: MAINNET_USDC as Address,
};

export const USDT_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_USDT as Address,
  [ChainId.BASECAMP]: TESTNET_USDT as Address, // Using testnet address as placeholder for mainnet
};

export const DAI_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_DAI as Address,
  [ChainId.BASECAMP]: TESTNET_DAI as Address, // Using testnet address as placeholder for mainnet
};

export const WBTC_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_WBTC as Address,
  [ChainId.BASECAMP]: TESTNET_WBTC as Address, // Using testnet address as placeholder for mainnet
};

export const WETH_ADDRESSES: ChainMap<Address> = {
  [ChainId.BASECAMP_TESTNET]: TESTNET_WETH as Address,
  [ChainId.BASECAMP]: TESTNET_WETH as Address, // Using testnet address as placeholder for mainnet
};

// RPC URLs
export const RPC_URLS: ChainMap<string[]> = {
  [ChainId.BASECAMP_TESTNET]: basecampTestnet.rpcUrls.default.http,
  [ChainId.BASECAMP]: campMainnet.rpcUrls.default.http,
};

// Block explorers
export const BLOCK_EXPLORERS: ChainMap<{ name: string; url: string }> = {
  [ChainId.BASECAMP_TESTNET]: basecampTestnet.blockExplorers.default,
  [ChainId.BASECAMP]: campMainnet.blockExplorers.default,
};

// Network names
export const NETWORK_NAMES: ChainMap<string> = {
  [ChainId.BASECAMP_TESTNET]: "Base Camp Testnet",
  [ChainId.BASECAMP]: "Camp Mainnet",
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
  chainId: ChainId.BASECAMP_TESTNET | ChainId.BASECAMP
) {
  return {
    // Tokens
    WCAMP: WCAMP_ADDRESSES[chainId],

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

    // Utilities
    MULTICALL3: MULTICALL3_ADDRESSES[chainId],
  };
}

// Export default chain configurations
export const CHAIN_CONFIGS = {
  [ChainId.BASECAMP_TESTNET]: {
    id: ChainId.BASECAMP_TESTNET,
    name: NETWORK_NAMES[ChainId.BASECAMP_TESTNET],
    network: "Basecamp",
    nativeCurrency: {
      decimals: 18,
      name: "CAMP",
      symbol: "CAMP",
    },
    rpcUrls: {
      default: {
        http: RPC_URLS[ChainId.BASECAMP_TESTNET],
      },
      public: {
        http: RPC_URLS[ChainId.BASECAMP_TESTNET],
      },
    },
    blockExplorers: {
      default: BLOCK_EXPLORERS[ChainId.BASECAMP_TESTNET],
    },
    contracts: {
      multicall3: basecampTestnet.contracts.multicall3,
    },
  },
  [ChainId.BASECAMP]: {
    id: ChainId.BASECAMP,
    name: NETWORK_NAMES[ChainId.BASECAMP],
    network: "Camp",
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
      multicall3: campMainnet.contracts.multicall3,
    },
  },
};
