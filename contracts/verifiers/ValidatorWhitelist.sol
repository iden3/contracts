// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {ZKPVerifierBase} from "./ZKPVerifierBase.sol";
import {IZKPVerifier} from "../interfaces/IZKPVerifier.sol";

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

    /// @dev Modifier to check if the validator is whitelisted
    modifier onlyWhitelistedValidator(ICircuitValidator validator) {
        require(isWhitelistedValidator(validator), "Validator is not whitelisted");
        _;
    }

    /// @dev Sets a ZKP request
    /// @param requestId The ID of the ZKP request
    /// @param request The ZKP request data
    function setZKPRequest(
        uint64 requestId,
        IZKPVerifier.ZKPRequest calldata request
    ) public virtual override onlyWhitelistedValidator(request.validator) {
        super.setZKPRequest(requestId, request);
    }

    /**
     * @dev Set the list of ZKP requests for the list of requestIds in the same order.
     * @param requestIds Request ids of the ZKP requests.
     * @param requests ZKP requests to set.
     */
    function setZKPRequests(
        uint64[] calldata requestIds,
        ZKPRequest[] calldata requests
    ) public virtual override {
        for (uint256 i = 0; i < requestIds.length; i++) {
            setZKPRequest(requestIds[i], requests[i]);
        }
    }

    /// @dev Verifies a ZKP response without updating any proof status
    /// @param requestId The ID of the ZKP request
    /// @param inputs The public inputs for the proof
    /// @param a The first component of the proof
    /// @param b The second component of the proof
    /// @param c The third component of the proof
    /// @param sender The sender on behalf of which the proof is done
    function verifyZKPResponse(
        uint64 requestId,
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        address sender
    ) public virtual override returns (ICircuitValidator.KeyToInputIndex[] memory) {
        ICircuitValidator validator = getZKPRequest(requestId).validator;
        require(isWhitelistedValidator(validator), "Validator is not whitelisted");
        return super.verifyZKPResponse(requestId, inputs, a, b, c, sender);
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

    function _getRequestIfCanBeVerified(
        uint64 requestId
    )
        internal
        view
        virtual
        override
        onlyWhitelistedValidator(getZKPRequest(requestId).validator)
        returns (IZKPVerifier.ZKPRequest storage)
    {
        return super._getRequestIfCanBeVerified(requestId);
    }
}
