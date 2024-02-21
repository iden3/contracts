// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {INonMerklizedIssuer} from "../interfaces/INonMerklizedIssuer.sol";
import {IdentityBase} from "./IdentityBase.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @dev NonMerklizedIssuerBase. Non-merklized base contract to issue non-merklized credentials
 */
abstract contract NonMerklizedIssuerBase is INonMerklizedIssuer, IdentityBase, ERC165 {
    /**
     * @dev Constant representing the credential adapter version
     */
    string public constant CREDENTIAL_ADAPTER_VERSION = "0.0.1";

    /**
     * @dev getCredentialAdapterVersion. Get version of the credential adapter
     */
    function getCredentialAdapterVersion() external pure returns (string memory) {
        return CREDENTIAL_ADAPTER_VERSION;
    }

    /**
     * @dev supportsInterface. Check if the contract supports the interface
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(INonMerklizedIssuer).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
