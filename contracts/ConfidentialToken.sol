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