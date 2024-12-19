// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {Verifier} from "./Verifier.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";

error ValidatorIsNotWhitelisted(address validator);

contract ValidatorWhitelist is Verifier {
    /// @custom:storage-location erc7201:iden3.storage.ValidatorWhitelist
    struct ValidatorWhitelistStorage {
        mapping(IRequestValidator => bool isApproved) _validatorWhitelist;
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

    /**
     * @dev Sets different requests
     * @param singleRequests The requests that are not in any group
     * @param groupedRequests The requests that are in a group
     */
    function setRequests(
        IVerifier.Request[] calldata singleRequests,
        IVerifier.GroupedRequests[] calldata groupedRequests
    ) public virtual override {
        for (uint256 i = 0; i < singleRequests.length; i++) {
            IRequestValidator validator = singleRequests[i].validator;
            if (!isWhitelistedValidator(validator)) {
                revert ValidatorIsNotWhitelisted(address(validator));
            }
        }

        for (uint256 i = 0; i < groupedRequests.length; i++) {
            for (uint256 j = 0; j < groupedRequests[i].requests.length; j++) {
                IRequestValidator validator = groupedRequests[i].requests[j].validator;
                if (!isWhitelistedValidator(validator)) {
                    revert ValidatorIsNotWhitelisted(address(validator));
                }
            }
        }
        super.setRequests(singleRequests, groupedRequests);
    }

    /**
     * @dev Submits an array of responses and updates proofs status
     * @param authResponses The list of auth responses including auth type and proof
     * @param singleResponses The list of responses including request ID, proof and metadata for single requests
     * @param groupedResponses The list of responses including request ID, proof and metadata for grouped requests
     * @param crossChainProofs The list of cross chain proofs from universal resolver (oracle). This
     * includes identities and global states.
     */
    function submitResponse(
        IVerifier.AuthResponse[] memory authResponses,
        IVerifier.Response[] memory singleResponses,
        IVerifier.GroupedResponses[] memory groupedResponses,
        bytes memory crossChainProofs
    ) public virtual override {
        for (uint256 i = 0; i < singleResponses.length; i++) {
            IRequestValidator validator = getRequest(singleResponses[i].requestId).validator;
            if (!isWhitelistedValidator(validator)) {
                revert ValidatorIsNotWhitelisted(address(validator));
            }
        }

        for (uint256 i = 0; i < groupedResponses.length; i++) {
            for (uint256 j = 0; j < groupedResponses[i].responses.length; j++) {
                IRequestValidator validator = getRequest(groupedResponses[i].responses[j].requestId)
                    .validator;
                if (!isWhitelistedValidator(validator)) {
                    revert ValidatorIsNotWhitelisted(address(validator));
                }
            }
        }
        super.submitResponse(authResponses, singleResponses, groupedResponses, crossChainProofs);
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

    function _addValidatorToWhitelist(IRequestValidator validator) internal {
        require(
            IERC165(address(validator)).supportsInterface(type(IRequestValidator).interfaceId),
            "Validator doesn't support relevant interface"
        );

        _getValidatorWhitelistStorage()._validatorWhitelist[validator] = true;
    }

    function _removeValidatorFromWhitelist(IRequestValidator validator) internal {
        _getValidatorWhitelistStorage()._validatorWhitelist[validator] = false;
    }
}
