import { ChainId } from "@fusionx-finance/sdk";

export const V3_SUBGRAPH_URL = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]:
    "https://lb.graph.summitx.finance/subgraphs/name/summitx-exchange-v3",
  [ChainId.MANTLE]:
    "https://lb.graph.mainnet.summitx.finance/subgraphs/name/summitx-exchange-v3",
};

export const V2_SUBGRAPH_URL = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]:
    "https://lb.graph.summitx.finance/subgraphs/name/summitx-exchange-v2",
  [ChainId.MANTLE]:
    "https://lb.graph.mainnet.summitx.finance/subgraphs/name/summitx-exchange-v2",
};

export const LAUNCHPAD_SUBGRAPH_URL = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]: "",
  [ChainId.MANTLE]: "",
};

export const INETEGRATED_API = {
  [ChainId.MANTLE_SEPOLIA_TESTNET]:
    "https://integrated-api.summitx.finance/api",
  [ChainId.MANTLE]: "https://integrated-api.mainnet.summitx.finance/api",
};
