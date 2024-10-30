pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ERC20PermitToken is ERC20Permit {
    constructor(uint256 initialSupply) ERC20Permit("TEST") ERC20("EIP-2612 TEST", "EIP2612-TST") {
        _mint(msg.sender, initialSupply);
    }
}
