//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract EscrowToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // 100 MILLION
        // The token has 18 decimals
        _mint(msg.sender, 100000000 * 10**uint256(decimals()));
    }
}
