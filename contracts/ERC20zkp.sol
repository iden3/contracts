// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./lib/GenesisUtils.sol";
import "./interfaces/IERC20zkp.sol";
import "./interfaces/ICircuitValidator.sol";

contract ERC20ZKP is ERC20, IERC20ZKP {
    ICircuitValidator public circuitValidator;

    ICircuitValidator.CircuitQuery internal query;

    mapping(uint256 => address) public idToAddress;
    mapping(address => uint256) public addressToId;

    constructor(
        string memory name_,
        string memory symbol_,
        address validator_,
        uint256 querySchema_,
        uint256 querySlotIndex_,
        uint256 queryOperator_,
        uint256[] memory queryValue_
    ) ERC20(name_, symbol_) {
        circuitValidator = ICircuitValidator(validator_);

        query.schema = querySchema_;
        query.value = queryValue_;
        query.operator = queryOperator_;
        query.slotIndex = querySlotIndex_;
        query.circuitId = circuitValidator.getCircuitId();
    }

    function _mintWithProof(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256 amount
    ) internal returns (bool) {
        address addr = GenesisUtils.int256ToAddress(
            inputs[circuitValidator.getChallengeInputIndex()]
        );
        uint256 userId = inputs[circuitValidator.getUserIdInputIndex()];

        require(msg.sender == addr, "msg.sender != address in proof");
        require(
            idToAddress[userId] == address(0),
            "identity can't mint token more than once"
        );
        require(
            addressToId[addr] == 0,
            "address can't mint token more than once"
        );

        require(
            circuitValidator.verify(inputs, a, b, c, query),
            "zero-knowledge proof is not valid"
        );
        super._mint(msg.sender, amount);
        idToAddress[userId] = addr;
        addressToId[addr] = userId;
        return (true);
    }

    function transferWithProof(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256 amount
    ) public returns (bool) {
        address addr = GenesisUtils.int256ToAddress(
            inputs[circuitValidator.getChallengeInputIndex()]
        );

        require(
            circuitValidator.verify(inputs, a, b, c, query),
            "zero-knowledge proof is not valid"
        );
        super.transfer(addr, amount);
        return (true);
    }

    function transfer(
        address, /* to */
        uint256 /* amount */
    ) public pure override returns (bool) {
        revert("ERC20ZKP: only transfers with zkp are allowed.");
    }

    function transferFrom(
        address, /* from */
        address, /* to */
        uint256 /* amount */
    ) public pure override returns (bool) {
        revert("ERC20ZKP: only transfers with zkp are allowed.");
    }

    function getCircuitQuery()
        external
        view
        returns (ICircuitValidator.CircuitQuery memory)
    {
        return query;
    }
}
