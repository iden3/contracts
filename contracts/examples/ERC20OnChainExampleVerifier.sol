// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/ICircuitValidator.sol";
import "../OnChainZKExampleVerifier.sol";
import "../lib/GenesisUtils.sol";

contract ERC20OnchainExampleVerifier is ERC20, OnChainZKExampleVerifier {
    uint64 public constant KYC_REQUEST_ID = 1;
    string private constant ADDRESS = "userEthereumAddressInClaim";

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function _beforeProofSubmit(
        uint64, /* requestId */
        uint256[] memory inputs,
        ICircuitValidator validator
    ) internal view override {
        address addr = GenesisUtils.int256ToAddress(inputs[validator.inputIndexOf(ADDRESS)]);
        require(_msgSender() == addr, "address in the proof is not a sender address");
    }

    function _beforeTokenTransfer(
        address, /* from */
        address to,
        uint256 /* amount */
    ) internal view override {
        require(
            proofs[to][KYC_REQUEST_ID] == true,
            "only identities who provided proof are allowed to receive tokens"
        );
    }

    function mint(address account, uint256 amount) public {
        super._mint(account, amount);
    }
}
