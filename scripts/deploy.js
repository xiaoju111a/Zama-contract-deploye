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