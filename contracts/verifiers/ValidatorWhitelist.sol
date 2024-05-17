// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";

contract ValidatorWhitelist is ZKPVerifierBase {
    /// @custom:storage-location erc7201:iden3.storage.ValidatorWhitelist
    struct ValidatorWhitelistStorage {
        mapping(ICircuitValidator => bool isApproved) _validatorWhitelist;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.ValidatorWhitelist")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant ValidatorWhitelistStorageLocation =
        0x76aa24e3538905838cc74060b2aa4c054b1e474aacf44741879e1850715e9300;

    function _getValidatorWhitelistStorage()
        private
        pure
        returns (ValidatorWhitelistStorage storage $)
    {
        assembly {
            $.slot := ValidatorWhitelistStorageLocation
        }
    }

    /// @dev Submits a ZKP response and updates proof status
    /// @param requestId The ID of the ZKP request
    /// @param inputs The input data for the proof
    /// @param a The first component of the proof
    /// @param b The second component of the proof
    /// @param c The third component of the proof
    function submitZKPResponse(
        uint64 requestId,
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) public virtual override {
        ICircuitValidator validator = getZKPRequest(requestId).validator;
        require(isWhitelistedValidator(validator), "Validator is not whitelisted");
        super.submitZKPResponse(requestId, inputs, a, b, c);
    }

    /// @dev Checks if validator is whitelisted
    /// @param validator The validator address
    /// @return True if validator is whitelisted, otherwise returns false
    function isWhitelistedValidator(
        ICircuitValidator validator
    ) public view virtual returns (bool) {
        return _getValidatorWhitelistStorage()._validatorWhitelist[validator];
    }

    function _addValidatorToWhitelist(ICircuitValidator validator) internal {
        require(
            IERC165(address(validator)).supportsInterface(type(ICircuitValidator).interfaceId),
            "Validator doesn't support relevant interface"
        );

        _getValidatorWhitelistStorage()._validatorWhitelist[validator] = true;
    }

    function _removeValidatorFromWhitelist(ICircuitValidator validator) internal {
        _getValidatorWhitelistStorage()._validatorWhitelist[validator] = false;
    }
}
