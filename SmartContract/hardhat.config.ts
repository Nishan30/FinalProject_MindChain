require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const GOERLI_RPC_URL = `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`; // Or your Alchemy URL
const SEPOLIA_RPC_URL = `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`; // Or your Alchemy URL
const PRIVATE_KEY = process.env.PRIVATE_KEY;

module.exports = {
  solidity: "0.8.9", // Or your Solidity version
  networks: {
    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
  },
};