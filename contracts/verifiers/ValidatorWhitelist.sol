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

    /// @dev Checks if validator is whitelisted
    /// @param validator The validator address
    /// @return True if validator is whitelisted, otherwise returns false
    function isWhitelistedValidator(ICircuitValidator validator) public view virtual returns (bool) {
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
