// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../lib/GenesisUtils.sol";
import "../interfaces/IERC20zkp.sol";
import "../interfaces/ICircuitValidator.sol";
import "../ZKPVerifier.sol";

contract ERC20Verifier is ERC20, ZKPVerifier {

    uint64 constant AGE_REQUEST_ID = 1;

    ICircuitValidator public mtpCircuitValidator = ICircuitValidator(address(0x6522C1d0d9b522b797dDA1E4C849B12f08e9c15d));
    ICircuitValidator.CircuitQuery internal ageProofQuery;

    mapping(uint256 => address) public idToAddress;
    mapping(address => uint256) public addressToId;

    uint256 constant TOKEN_AMOUNT_FOR_AIRDROP_PER_ID = 5;


    constructor(
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {

        ageProofQuery.schema = 210459579859058135404770043788028292398; // age schema
        ageProofQuery.operator = 2;
        ageProofQuery.slotIndex = 2;
        ageProofQuery.value = [20020101];
        ageProofQuery.circuitId = mtpCircuitValidator.getCircuitId();

        _setDefaultRequest(AGE_REQUEST_ID,mtpCircuitValidator, ageProofQuery);

    }

    function _setDefaultRequest(uint64 requestId,ICircuitValidator validator, ICircuitValidator.CircuitQuery memory  query ) internal {
        requestQueries[AGE_REQUEST_ID].value = query.value;
        requestQueries[requestId].operator = query.operator;
        requestQueries[requestId].circuitId = query.circuitId;
        requestQueries[requestId].slotIndex = query.slotIndex;
        requestQueries[requestId].circuitId = query.circuitId;

        requestValidators[requestId] = validator;
    }

    function _beforeProofSubmit(
        uint64 /* requestId */,
        uint256[] memory inputs,
        ICircuitValidator validator
    ) internal view override {

        // check that  challenge input is address of sender
        address addr = GenesisUtils.int256ToAddress(
            inputs[validator.getChallengeInputIndex()]
        );
        // this is linking between msg.sender and
        require(_msgSender() == addr, "address in proof is not in the proof");
    }
    function _afterProofSubmit(
        uint64 requestId,
        uint256[] memory inputs,
        ICircuitValidator validator
    ) internal override {

        // check airdrop condition
        if (requestId == AGE_REQUEST_ID && addressToId[_msgSender()] == 0) {
              // address didn't get airdrop tokens
              uint256  id =  inputs[validator.getChallengeInputIndex()];
              // additional check didn't get airdrop tokens before
              if (idToAddress[id] == address(0)) {
                  super._mint(_msgSender(), TOKEN_AMOUNT_FOR_AIRDROP_PER_ID);
                  addressToId[_msgSender()] = id;
                  idToAddress[id] = _msgSender();
              }
        }
    }
    function _beforeTokenTransfer(
        address from,
        address /* to */,
        uint256 /* amount */
    ) internal view override {
        require(proofs[from][AGE_REQUEST_ID] == true, "only identities who proved their age are allowed to transfer");
    }
}
