// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import {IGroth16Verifier} from "../../interfaces/IGroth16Verifier.sol";
import {IRequestValidator} from "../../interfaces/IRequestValidator.sol";

abstract contract RequestValidatorBase is IRequestValidator {
    /// @dev Main storage structure for the contract
    /// @custom:storage-location iden3.storage.RequestValidatorBaseStorage
    struct RequestValidatorBaseStorage {
        mapping(string => IGroth16Verifier) _circuitIdToGroth16Verifier;
        string[] _supportedCircuitIds;
        mapping(string => uint256) _requestParamNameToIndex;
        mapping(string => uint256) _inputNameToIndex;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.RequestValidatorBase")) - 1))
    //  & ~bytes32(uint256(0xff));
    // solhint-disable-next-line const-name-snakecase
    bytes32 private constant RequestValidatorBaseStorageLocation =
        0xd90b97ccc3cb854254aeec1e5c25748ff7146358b68741074181b650621e5d00;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getRequestValidatorBaseStorage()
        private
        pure
        returns (RequestValidatorBaseStorage storage $)
    {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := RequestValidatorBaseStorageLocation
        }
    }

    /**
     * @dev Get the index of the request param by name
     * @param name Name of the request param
     * @return Index of the request param
     */
    function requestParamIndexOf(string memory name) public view returns (uint256) {
        uint256 index = _getRequestValidatorBaseStorage()._requestParamNameToIndex[name];
        if (index == 0) revert RequestParamNameNotFound();
        return --index; // we save 1-based index, but return 0-based
    }

    /**
     * @dev Get the index of the public input of the circuit by name
     * @param name Name of the public input
     * @return Index of the public input
     */
    function inputIndexOf(string memory name) public view returns (uint256) {
        uint256 index = _getRequestValidatorBaseStorage()._inputNameToIndex[name];
        if (index == 0) {
            revert InputNameNotFound();
        }
        return --index; // we save 1-based index, but return 0-based
    }

    /**
     * @dev Get supported circuit ids
     * @return ids Array of circuit ids supported
     */
    function getSupportedCircuitIds() public view returns (string[] memory ids) {
        return _getRequestValidatorBaseStorage()._supportedCircuitIds;
    }

    /**
     * @dev Get the verifier by circuit id
     * @param circuitId Circuit id
     * @return The verifier
     */
    function getVerifierByCircuitId(
        string memory circuitId
    ) public view returns (IGroth16Verifier) {
        return _getRequestValidatorBaseStorage()._circuitIdToGroth16Verifier[circuitId];
    }

    function _setRequestParamToIndex(string memory requestParamName, uint256 index) internal {
        // increment index to avoid 0
        _getRequestValidatorBaseStorage()._requestParamNameToIndex[requestParamName] = ++index;
    }

    function _setInputToIndex(string memory inputName, uint256 index) internal {
        // increment index to avoid 0
        _getRequestValidatorBaseStorage()._inputNameToIndex[inputName] = ++index;
    }

    function _setGroth16Verifier(string memory circuitId, IGroth16Verifier verifier) internal {
        _getRequestValidatorBaseStorage()._supportedCircuitIds.push(circuitId);
        _getRequestValidatorBaseStorage()._circuitIdToGroth16Verifier[circuitId] = verifier;
    }
}
