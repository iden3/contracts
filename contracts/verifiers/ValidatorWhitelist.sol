// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {Verifier} from "./Verifier.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

error ValidatorIsNotWhitelisted(address validator);
error ValidatorNotSupportInterface(address validator);

contract ValidatorWhitelist is Verifier {
    /// @custom:storage-location erc7201:iden3.storage.ValidatorWhitelist
    struct ValidatorWhitelistStorage {
        mapping(IRequestValidator => bool isApproved) _validatorWhitelist;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.ValidatorWhitelist")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant ValidatorWhitelistStorageLocation =
        0x76aa24e3538905838cc74060b2aa4c054b1e474aacf44741879e1850715e9300;

    /// @dev Modifier to check if the validator is whitelisted
    modifier onlyWhitelistedValidator(IRequestValidator validator) {
        if (!isWhitelistedValidator(validator)) {
            revert ValidatorIsNotWhitelisted(address(validator));
        }
        _;
    }

    /**
     * @dev Checks if validator is whitelisted
     * @param validator The validator address
     * @return True if validator is whitelisted, otherwise returns false
     */
    function isWhitelistedValidator(
        IRequestValidator validator
    ) public view virtual returns (bool) {
        return _getValidatorWhitelistStorage()._validatorWhitelist[validator];
    }

    function _getValidatorWhitelistStorage()
        private
        pure
        returns (ValidatorWhitelistStorage storage $)
    {
        assembly {
            $.slot := ValidatorWhitelistStorageLocation
        }
    }

    function _addValidatorToWhitelist(IRequestValidator validator) internal {
        if (!IERC165(address(validator)).supportsInterface(type(IRequestValidator).interfaceId)) {
            revert ValidatorNotSupportInterface(address(validator));
        }

        _getValidatorWhitelistStorage()._validatorWhitelist[validator] = true;
    }

    function _removeValidatorFromWhitelist(IRequestValidator validator) internal {
        _getValidatorWhitelistStorage()._validatorWhitelist[validator] = false;
    }

    function _getRequestIfCanBeVerified(
        uint256 requestId
    )
        internal
        view
        virtual
        override
        onlyWhitelistedValidator(getRequest(requestId).validator)
        returns (IVerifier.RequestData storage)
    {
        return super._getRequestIfCanBeVerified(requestId);
    }

    function _setRequest(Request calldata request) internal virtual override {
        IRequestValidator validator = request.validator;
        if (!isWhitelistedValidator(validator)) {
            revert ValidatorIsNotWhitelisted(address(validator));
        }
        super._setRequest(request);
    }
}
