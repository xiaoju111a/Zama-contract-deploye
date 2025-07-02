# Zama-contract-deploye
# Zama机密合约部署完整教程

## 概述

Zama的fhEVM使用全同态加密(FHE)技术，让开发者能够在以太坊等EVM链上编写机密智能合约。通过fhEVM，交易输入和状态保持端到端加密，节点运营商也无法看到数据。开发者可以使用简单的机密Solidity智能合约，无需深入了解密码学知识。

## 核心特性

- **端到端加密**：交易中包含的数据被加密，任何人都无法看到
- **链上可组合性**：状态在保持加密的同时持续更新
- **Solidity集成**：fhEVM合约是使用传统Solidity工具链构建的简单Solidity合约
- **编程隐私**：开发者可以使用euint数据类型来标记合约中应该保密的部分

## 环境准备

### 1. 安装依赖

```bash
# 使用npm
npm install fhevm-contracts

# 使用Yarn  
yarn add fhevm-contracts

# 使用pnpm
pnpm add fhevm-contracts
```

### 2. Hardhat设置

```bash
npm install --save-dev hardhat
npx hardhat init
```

安装fhEVM相关依赖：
```bash
npm install fhevm
npm install @nomicfoundation/hardhat-toolbox
```

### 3. 配置Hardhat

创建或修改 `hardhat.config.js`：

```javascript
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
```

## 编写机密ERC20合约

基于Zama提供的机密ERC20示例，创建一个机密代币合约：

### 合约代码

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { SepoliaZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import { ConfidentialERC20 } from "fhevm-contracts/contracts/token/ERC20/ConfidentialERC20.sol";

contract MyConfidentialToken is SepoliaZamaFHEVMConfig, ConfidentialERC20 {
    constructor() ConfidentialERC20("ConfidentialToken", "CTOKEN") {
        // 初始铸造1,000,000个代币给部署者
        // 注意参数顺序: _unsafeMint(address to, uint64 amount)
        _unsafeMint(msg.sender, 1000000);
    }
    
    // 自定义铸造函数 - 使用uint64类型
    function mint(uint64 mintedAmount) public {
        _unsafeMint(msg.sender, mintedAmount);
    }
    
    // 铸造给指定地址
    function mintTo(address to, uint64 amount) public {
        _unsafeMint(to, amount);
    }
}
```




## 部署合约

### 1. 创建部署脚本

创建 `scripts/deploy.js`：

```javascript
const { ethers } = require("hardhat");

async function main() {
  console.log("开始部署机密代币合约...");
  
  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  
  // 检查账户余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("账户余额:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    console.warn("警告: 账户余额可能不足以支付gas费用");
  }
  
  try {
    // 获取合约工厂
    console.log("获取合约工厂...");
    const Token = await ethers.getContractFactory("MyConfidentialToken");
    
    // 部署合约
    console.log("正在部署合约...");
    const token = await Token.deploy();
    
    // 等待部署交易被挖掘
    console.log("等待部署交易确认...");
    await token.waitForDeployment();
    
    // 获取合约地址和部署交易信息
    const contractAddress = await token.getAddress();
    const deployTx = token.deploymentTransaction();
    
    console.log("✅ 合约部署成功!");
    console.log(`📍 合约地址: ${contractAddress}`);
    console.log(`🔗 部署交易哈希: ${deployTx.hash}`);
    console.log(`⛽ Gas Used: ${deployTx.gasLimit?.toString() || 'N/A'}`);
    
    // 等待几个区块确认
    console.log("等待区块确认...");
    const receipt = await deployTx.wait(3);
    console.log(`✅ 已确认 ${receipt.confirmations} 个区块`);
    
    // 验证合约部署
    console.log("\n验证合约基本信息...");
    try {
      const name = await token.name();
      const symbol = await token.symbol();
      console.log(`📛 代币名称: ${name}`);
      console.log(`🏷️  代币符号: ${symbol}`);
      
      // 如果有余额查询功能，可以检查部署者初始余额
      console.log("✅ 合约验证成功!");
    } catch (verifyError) {
      console.log("⚠️  合约验证失败，但部署可能成功:", verifyError.message);
    }
    
    // 保存部署信息到文件
    const deploymentInfo = {
      contractAddress: contractAddress,
      transactionHash: deployTx.hash,
      deployer: deployer.address,
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      gasUsed: receipt.gasUsed?.toString(),
      blockNumber: receipt.blockNumber
    };
    
    const fs = require('fs');
    const path = require('path');
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    
    // 创建deployments目录如果不存在
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    // 保存部署信息
    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`📄 部署信息已保存到: ${deploymentFile}`);
    
    console.log("\n🎉 部署完成！");
    console.log("\n下一步:");
    console.log(`1. 验证合约: npx hardhat verify --network ${hre.network.name} ${contractAddress}`);
    console.log(`2. 与合约交互: 使用地址 ${contractAddress}`);
    
  } catch (error) {
    console.error("❌ 部署失败:");
    console.error(error);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log("\n💡 解决方案:");
      console.log("- 确保账户有足够的ETH支付gas费用");
      console.log("- 如果在测试网，请从水龙头获取测试ETH");
    } else if (error.code === 'NETWORK_ERROR') {
      console.log("\n💡 解决方案:");
      console.log("- 检查网络连接");
      console.log("- 确认RPC URL配置正确");
    }
    
    process.exit(1);
  }
}

// 兼容ethers v5和v6的辅助函数
async function getContractInfo(contract) {
  try {
    // ethers v6 方式
    if (typeof contract.getAddress === 'function') {
      return {
        address: await contract.getAddress(),
        deployTx: contract.deploymentTransaction()
      };
    }
    // ethers v5 方式 (fallback)
    else if (contract.address) {
      return {
        address: contract.address,
        deployTx: contract.deployTransaction
      };
    }
  } catch (error) {
    console.warn("获取合约信息失败:", error.message);
    return null;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("脚本执行失败:", error);
    process.exit(1);
  });
```

### 2. 部署到测试网

```bash
# 设置环境变量
export PRIVATE_KEY="your-private-key"
export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/your-project-id"

# 部署到Sepolia测试网
npx hardhat run scripts/deploy.js --network sepolia
```

## 与合约交互

### 1. JavaScript SDK使用

Zama提供了JavaScript SDK来简化加密和解密过程：

```javascript
const { ethers } = require("ethers");
const { FhevmInstance } = require("fhevmjs");

async function interactWithContract() {
  // 连接到合约
  const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const contractAddress = "your-deployed-contract-address";
  const contract = new ethers.Contract(contractAddress, contractABI, wallet);
  
  // 初始化fhEVM实例
  const instance = await FhevmInstance.create({ chainId: 11155111 }); // Sepolia chainId
  
  // 加密转账金额
  const encryptedAmount = instance.encrypt32(100); // 加密100个代币
  
  // 执行加密转账
  const tx = await contract.transfer("0xRecipientAddress", encryptedAmount);
  await tx.wait();
  
  console.log("加密转账完成！");
  
  // 解密余额（需要用户授权）
  const encryptedBalance = await contract.balanceOf(wallet.address);
  const balance = instance.decrypt(encryptedBalance);
  console.log(`解密后的余额: ${balance}`);
}
```



## 测试网络和资源

### 测试网信息

- **Sepolia测试网**：可以在Sepolia测试网上部署和测试机密ERC20合约
- **获取测试ETH**：使用Sepolia水龙头获取测试ETH
- **区块浏览器**：使用Sepolia Etherscan查看交易

### 开发资源

- **官方文档**：查看开发者文档获取更多信息
- **示例代码**：Zama提供了多种示例，包括投票系统、身份管理、游戏等
- **社区支持**：加入Zama社区获得技术支持

## 注意事项

### 许可证要求

Zama的库在BSD-3-Clause-Clear许可证下免费用于开发、研究、原型制作和实验。但是，任何商业使用都需要购买Zama的商业专利许可证。

### 加密数据类型

fhEVM库支持以下加密类型和操作：euint8、euint16、euint32等加密整数类型。

### 访问控制

智能合约包含计算状态和加密状态可见性的所有逻辑。智能合约开发者决定如何向请求的用户显示合约状态，有效地让合约本身执行访问控制逻辑。

## 高级用例

基于收集的信息，fhEVM支持多种高级用例，包括机密支付、代币化和RWA、盲拍、链上游戏、机密投票、加密身份等。

## 总结

通过以上步骤，你已经成功学会了如何：

1. 设置fhEVM开发环境
2. 编写机密智能合约
3. 部署到测试网
4. 与合约进行交互
5. 集成到前端应用

Zama协议正在推动区块链隐私保护的发展，使得机密智能合约成为现实。通过全同态加密技术，开发者可以构建既保持数据隐私又具有完全可组合性的去中心化应用。