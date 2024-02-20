// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {INonMerklizedIssuer} from "../interfaces/INonMerklizedIssuer.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @dev NonMerklizedIssuerBase. Non-merklized base contract to issue non-merklized credentials
 */
abstract contract NonMerklizedIssuerBase is INonMerklizedIssuer, ERC165 {
    /**
     * @dev Constant representing the protocol version
     */
    string public constant CREDENTIAL_PROTOCOL_VERSION = "0.0.1";

    /**
     * @dev getCredentialProtocolVersion. Get version of the credential protocol
     */
    function getCredentialProtocolVersion() external pure returns (string memory) {
        return CREDENTIAL_PROTOCOL_VERSION;
    }

    /**
     * @dev supportsInterface. Check if the contract supports the interface
     */
    function supportsInterface(bytes4 interfaceId) public view override virtual returns (bool) {
        return
            interfaceId == type(INonMerklizedIssuer).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
