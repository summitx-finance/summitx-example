/**
 * Unified chain configuration with ChainMap pattern
 * Supports both Mantle Testnet and Mantle Mainnet
 */

import { ChainId } from "@fusionx-finance/sdk";
import type { Address } from "viem";
import {
  MIXED_ROUTE_QUOTER_ADDRESS as MAINNET_MIXED_QUOTER,
  SMART_ROUTER_ADDRESS as MAINNET_SMART_ROUTER,
  USDC_ADDRESS as MAINNET_USDC,
  V2_FACTORY_ADDRESS as MAINNET_V2_FACTORY,
  V2_ROUTER_ADDRESS as MAINNET_V2_ROUTER,
  V3_QUOTER_ADDRESS as MAINNET_V3_QUOTER,
  WMANTLE_ADDRESS as MAINNET_WMANTLE,
  mantleMainnet,
} from "./mantle-mainnet";
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
  WETH_ADDRESS as TESTNET_WETH,
  WMANTLE_ADDRESS as TESTNET_WMANTLE,
  mantleSepoliaTestnet,
} from "./mantle-testnet";

// Type for chain-specific addresses
export type ChainMap<T> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: T;
  [ChainId.MANTLE]: T;
  [key: number]: T; // Allow numeric chain IDs for chains not yet in ChainId enum
};

// WMANTLE/Native token addresses
export const WMANTLE_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_WMANTLE as Address,
  [ChainId.MANTLE]: MAINNET_WMANTLE as Address,
};

// DEX Router addresses
export const SMART_ROUTER_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_SMART_ROUTER as Address,
  [ChainId.MANTLE]: MAINNET_SMART_ROUTER as Address,
};

export const V2_ROUTER_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_V2_ROUTER as Address,
  [ChainId.MANTLE]: MAINNET_V2_ROUTER as Address,
};

// Factory addresses
export const V2_FACTORY_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_V2_FACTORY as Address,
  [ChainId.MANTLE]: MAINNET_V2_FACTORY as Address,
};

export const V3_FACTORY_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]:
    "0x8A74c5E686D33C5Fe5F98c361f6e24e35e899EF6",
  [ChainId.MANTLE]: "0x530d2766D1988CC1c000C8b7d00334c14B69AD71",
};

// Position managers
export const NFT_POSITION_MANAGER_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]:
    "0xe58ACA7B8F9dF3827025759A25ba0d26217f3109",
  [ChainId.MANTLE]: "0x5752F085206AB87d8a5EF6166779658ADD455774",
};

// Quoter addresses
export const QUOTER_V2_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_V3_QUOTER as Address,
  [ChainId.MANTLE]: MAINNET_V3_QUOTER as Address,
};

export const MIXED_ROUTE_QUOTER_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_MIXED_QUOTER as Address,
  [ChainId.MANTLE]: MAINNET_MIXED_QUOTER as Address,
};

// Multicall addresses
export const MULTICALL3_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]:
    mantleSepoliaTestnet.contracts.multicall3.address,
  [ChainId.MANTLE]: mantleMainnet.contracts.multicall3.address,
};

// Token addresses
export const USDC_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_USDC as Address,
  [ChainId.MANTLE]: MAINNET_USDC as Address,
};

export const USDT_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_USDT as Address,
  [ChainId.MANTLE]: TESTNET_USDT as Address, // Using testnet address as placeholder for mainnet
};

export const DAI_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_DAI as Address,
  [ChainId.MANTLE]: TESTNET_DAI as Address, // Using testnet address as placeholder for mainnet
};

export const WBTC_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_WBTC as Address,
  [ChainId.MANTLE]: TESTNET_WBTC as Address, // Using testnet address as placeholder for mainnet
};

export const WETH_ADDRESSES: ChainMap<Address> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: TESTNET_WETH as Address,
  [ChainId.MANTLE]: TESTNET_WETH as Address, // Using testnet address as placeholder for mainnet
};

// RPC URLs
export const RPC_URLS: ChainMap<string[]> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: mantleSepoliaTestnet.rpcUrls.default.http,
  [ChainId.MANTLE]: mantleMainnet.rpcUrls.default.http,
};

// Block explorers
export const BLOCK_EXPLORERS: ChainMap<{ name: string; url: string }> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: mantleSepoliaTestnet.blockExplorers.default,
  [ChainId.MANTLE]: mantleMainnet.blockExplorers.default,
};

// Network names
export const NETWORK_NAMES: ChainMap<string> = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: "Mantle Sepolia",
  [ChainId.MANTLE]: "Mantle Mainnet",
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
  chainId: ChainId.MANTLE_SEPOLIA_TESTNET | ChainId.MANTLE
) {
  return {
    // Tokens
    WMANTLE: WMANTLE_ADDRESSES[chainId],

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
  [ChainId.MANTLE_SEPOLIA_TESTNET]: {
    id: ChainId.MANTLE_SEPOLIA_TESTNET,
    name: NETWORK_NAMES[ChainId.MANTLE_SEPOLIA_TESTNET],
    network: "Mantle Testnet",
    nativeCurrency: {
      decimals: 18,
      name: "MANTLE",
      symbol: "MANTLE",
    },
    rpcUrls: {
      default: {
        http: RPC_URLS[ChainId.MANTLE_SEPOLIA_TESTNET],
      },
      public: {
        http: RPC_URLS[ChainId.MANTLE_SEPOLIA_TESTNET],
      },
    },
    blockExplorers: {
      default: BLOCK_EXPLORERS[ChainId.MANTLE_SEPOLIA_TESTNET],
    },
    contracts: {
      multicall3: mantleSepoliaTestnet.contracts.multicall3,
    },
  },
  [ChainId.MANTLE]: {
    id: ChainId.MANTLE,
    name: NETWORK_NAMES[ChainId.MANTLE],
    network: "Mantle",
    nativeCurrency: {
      decimals: 18,
      name: "MANTLE",
      symbol: "MANTLE",
    },
    rpcUrls: {
      default: {
        http: RPC_URLS[ChainId.MANTLE],
      },
      public: {
        http: RPC_URLS[ChainId.MANTLE],
      },
    },
    blockExplorers: {
      default: BLOCK_EXPLORERS[ChainId.MANTLE],
    },
    contracts: {
      multicall3: mantleMainnet.contracts.multicall3,
    },
  },
};
