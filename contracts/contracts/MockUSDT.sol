// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev Mock USDT token for testing purposes
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private _decimals = 6; // USDT has 6 decimals

    constructor() ERC20("Mock USDT", "USDT") Ownable(msg.sender) {
        // Mint initial supply to deployer (1 million USDT)
        _mint(msg.sender, 1_000_000 * 10**_decimals);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    // Mint function for testing
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Faucet function for testing (anyone can get some tokens)
    function faucet() external {
        require(balanceOf(msg.sender) < 1000 * 10**_decimals, "Already has enough tokens");
        _mint(msg.sender, 1000 * 10**_decimals); // Give 1000 USDT
    }
}