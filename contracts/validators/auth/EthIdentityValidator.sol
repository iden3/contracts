// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {GenesisUtils} from "../../lib/GenesisUtils.sol";
import {IAuthValidator} from "../../interfaces/IAuthValidator.sol";
import {IState} from "../../interfaces/IState.sol";

error SenderIsNotIdentityOwner();

/**
 * @dev EthIdentityValidator validator
 */
contract EthIdentityValidator is Ownable2StepUpgradeable, IAuthValidator, ERC165 {
    struct PubSignals {
        uint256 userID;
    }

    /**
     * @dev Version of contract
     */
    string public constant VERSION = "1.0.0";

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param owner Owner of the contract
     */
    function initialize(address owner) public initializer {
        __Ownable_init(owner);
    }

    /**
     * @dev Get the version of the contract
     * @return Version of the contract
     */
    function version() public pure override returns (string memory) {
        return VERSION;
    }

    /**
     * @dev Verify the proof and check the request query data
     * @param sender Sender of the proof.
     * @param proof Proof packed as bytes to verify.
     * @param authMethodParams Auth method parameters for the verification.
     * @param responseMetadata Additional metadata from the response for the verification.
     * @return Array of signals as result.
     */
    function verify(
        address sender,
        bytes calldata proof,
        // solhint-disable-next-line no-unused-vars
        bytes calldata authMethodParams,
        // solhint-disable-next-line no-unused-vars
        bytes calldata responseMetadata
    ) public view override returns (uint256, AuthResponseField[] memory) {
        uint256 userID = abi.decode(proof, (uint256));

        _verifyEthIdentity(userID, sender);
        return (userID, new AuthResponseField[](0));
    }

    function _verifyEthIdentity(uint256 id, address sender) internal view {
        bytes2 idType = GenesisUtils.getIdType(id);
        uint256 calcId = GenesisUtils.calcIdFromEthAddress(idType, sender);
        if (calcId != id) {
            revert SenderIsNotIdentityOwner();
        }
    }
}
