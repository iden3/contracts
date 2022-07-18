// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../ERC20zkp.sol";
import "../interfaces/IZKPAirdrop.sol";

contract ExampleZKPToken is ERC20ZKP, IZKPAirdrop {
    uint256 constant schema = 210459579859058135404770043788028292398;
    uint256 constant slotIndex = 2;
    uint256 constant operator = 2;
    uint256[] private value = [20020101];

    uint256 constant tokensForAirdrop = 5;

    constructor(address validatorAddr)
        ERC20ZKP(
            "ExampleZKPToken",
            "ZKP2",
            validatorAddr,
            schema,
            slotIndex,
            operator,
            value
        )
    {}

    function mintWithProof(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) external returns (bool) {
        return super._mintWithProof(inputs, a, b, c, tokensForAirdrop);
    }
}
