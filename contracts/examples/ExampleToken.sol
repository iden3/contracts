// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "../lib/GenesisUtils.sol";
import "../interfaces/ICircuitValidator.sol";


contract ExampleToken is ERC20 {

    ICircuitValidator public mtpValidator;
    mapping(uint256 => address) public idToAddress;
    mapping(address => uint256) public addressToId;

    uint256 private schema = 210459579859058135404770043788028292398;
    uint256 private slotIndex = 2;
    uint256 private operator = 2;
    uint256 private value = 20020101;

    constructor(address mtpValidatorAddr) ERC20("ExampleToken", "ZKP") {
        mtpValidator = ICircuitValidator(mtpValidatorAddr);
    }

    function mintWithProof(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) public returns (bool) {
        address addr = GenesisUtils.int256ToAddress(inputs[2]);
        uint256 userId = inputs[0];

        require(msg.sender == addr, "msg.sender != address in proof");
        require(
            idToAddress[userId] == address(0),
            "identity can't mint token more than once"
        );
        require(
            addressToId[addr] == 0,
            "address can't mint token more than once"
        );

        require(inputs[7] == schema, "inputs[7] == schema");
        require(inputs[8] == slotIndex, "inputs[8] = slotIndex");
        require(inputs[9] == operator, "inputs[9] = operator");
        require(inputs[10] == value, "inputs[10] = value");


        ICircuitValidator.CircuitQuery memory query;
        query.schema = schema;
        query.slotIndex = slotIndex;
        query.operator = operator;
        query.value = new uint[](1);
        query.value[0] = value;

        require(mtpValidator.verify(inputs, a, b, c,query), "ZK proof is not valid");
        super._mint(msg.sender, 5);
        idToAddress[userId] = addr;
        addressToId[addr] = userId;
        return (true);
    }
}
