import { ChainId } from "@summitx/chains";

export const V3_SUBGRAPH_URL = {
  [ChainId.BASECAMP_TESTNET]:
    "https://lb.graph.summitx.finance/subgraphs/name/summitx-exchange-v3",
  [ChainId.BASECAMP]:
    "https://lb.graph.mainnet.summitx.finance/subgraphs/name/summitx-exchange-v3",
};

export const V2_SUBGRAPH_URL = {
  [ChainId.BASECAMP_TESTNET]:
    "https://lb.graph.summitx.finance/subgraphs/name/summitx-exchange-v2",
  [ChainId.BASECAMP]:
    "https://lb.graph.mainnet.summitx.finance/subgraphs/name/summitx-exchange-v2",
};

export const LAUNCHPAD_SUBGRAPH_URL = {
  [ChainId.BASECAMP_TESTNET]: "",
  [ChainId.BASECAMP]: "",
};

export const INETEGRATED_API = {
  [ChainId.BASECAMP_TESTNET]: "https://integrated-api.summitx.finance/api",
  [ChainId.BASECAMP]: "https://integrated-api.mainnet.summitx.finance/api",
};
