// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./lib/GenesisUtils.sol";
import "./interfaces/ICircuitValidator.sol";
import "./interfaces/IZKPVerifier.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";



contract ZKPVerifier is  IZKP, Ownable {

    // one time zkp allowances
    mapping(address => bytes4) public zkpAllowances;
    mapping(bytes4 => ICircuitValidator.CircuitQuery) public functionQueries;
    mapping(bytes4 => ICircuitValidator) public functionValidators;

    function submitZKPResponse(
        bytes4 fnSelector,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c
    ) override external returns (bool){
        require(functionValidators[fnSelector] != ICircuitValidator(address(0))); // validator exists
        require(functionQueries[fnSelector].schema != 0); // query exists
        require(
                functionValidators[fnSelector].verify(inputs, a, b, c, functionQueries[fnSelector]),
                "zero-knowledge proof is not valid"
            );
        zkpAllowances[msg.sender] = fnSelector;
        return true;
    }

    function getZKPRequest(bytes4 fnSelector) override external view returns (ICircuitValidator.CircuitQuery memory) {
        return functionQueries[fnSelector];
    }

    function setZKPRequest(bytes4 fnSelector,address validator, ICircuitValidator.CircuitQuery memory query) onlyOwner() override external returns (bool){

        functionQueries[fnSelector].value = query.value;
        functionQueries[fnSelector].operator = query.operator;
        functionQueries[fnSelector].circuitId = query.circuitId;
        functionQueries[fnSelector].slotIndex = query.slotIndex;
        functionQueries[fnSelector].circuitId = query.circuitId;

        functionValidators[fnSelector] = ICircuitValidator(validator);
        return true;
    }

}
