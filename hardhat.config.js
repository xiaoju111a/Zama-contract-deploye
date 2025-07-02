require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    // Sepolia测试网配置
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    // fhEVM本地测试网
    fhevm: {
      url: "http://localhost:8545",
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
