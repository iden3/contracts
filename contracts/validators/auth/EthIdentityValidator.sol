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

    /// @dev Main storage structure for the contract
    /// @custom:storage-location iden3.storage.EthIdentityValidator
    struct EthIdentityValidatorBaseStorage {
        IState state;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.EthIdentityValidator")) - 1))
    //  & ~bytes32(uint256(0xff));
    // solhint-disable-next-line const-name-snakecase
    bytes32 private constant EthIdentityValidatorBaseStorageLocation =
        0x1816cff28d525c2e505742319020369d0e29e8fafd5168e127e29766cf2be1fb;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getEthIdentityValidatorBaseStorage()
        private
        pure
        returns (EthIdentityValidatorBaseStorage storage $)
    {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := EthIdentityValidatorBaseStorageLocation
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param _stateContractAddr Address of the state contract
     * @param owner Owner of the contract
     */
    function initialize(address _stateContractAddr, address owner) public initializer {
        _initDefaultStateVariables(_stateContractAddr, owner);
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
     * @param params Request query data of the credential to verify.
     * @return Array of signals as result.
     */
    function verify(
        address sender,
        bytes calldata proof,
        // solhint-disable-next-line no-unused-vars
        bytes calldata params
    ) public view override returns (uint256, AuthResponseField[] memory) {
        uint256 userID = abi.decode(proof, (uint256));

        _verifyEthIdentity(userID, sender);
        return (userID, new AuthResponseField[](0));
    }

    function _getState() internal view returns (IState) {
        return _getEthIdentityValidatorBaseStorage().state;
    }

    function _initDefaultStateVariables(address _stateContractAddr, address owner) internal {
        EthIdentityValidatorBaseStorage storage s = _getEthIdentityValidatorBaseStorage();

        s.state = IState(_stateContractAddr);
        __Ownable_init(owner);
    }

    function _verifyEthIdentity(uint256 id, address sender) internal view {
        bytes2 idType = GenesisUtils.getIdType(id);
        uint256 calcId = GenesisUtils.calcIdFromEthAddress(idType, sender);
        if (calcId != id) {
            revert SenderIsNotIdentityOwner();
        }
    }
}
