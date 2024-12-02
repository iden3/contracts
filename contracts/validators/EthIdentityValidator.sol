// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {GenesisUtils} from "../lib/GenesisUtils.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IState} from "../interfaces/IState.sol";

/**
 * @dev EthIdentityValidator validator
 */
contract EthIdentityValidator is Ownable2StepUpgradeable, IRequestValidator, ERC165 {
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
    bytes32 private constant EthIdentityValidatorBaseStorageLocation =
        0x1816cff28d525c2e505742319020369d0e29e8fafd5168e127e29766cf2be1fb;
    
    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getEthIdentityValidatorBaseStorage()
        private
        pure
        returns (EthIdentityValidatorBaseStorage storage $)
    {
        assembly {
            $.slot := EthIdentityValidatorBaseStorageLocation
        }
    }

    /**
     * @dev Initialize the contract
     * @param _stateContractAddr Address of the state contract
     * @param owner Owner of the contract
     */
    function initialize(
        address _stateContractAddr,
        address owner
    ) public initializer {
        _initDefaultStateVariables(_stateContractAddr, owner);
    }

    function _initDefaultStateVariables(
        address _stateContractAddr,
        address owner
    ) internal {
        EthIdentityValidatorBaseStorage
            storage s = _getEthIdentityValidatorBaseStorage();

        s.state = IState(_stateContractAddr);
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
     * @param proof Proof packed as bytes to verify.
     * @param data Request query data of the credential to verify.
     * @param sender Sender of the proof.
     * @param stateContract State contract to get identities and gist states to check.
     * @return Array of signals as result.
     */
    function verify(
        bytes calldata proof,
        // solhint-disable-next-line no-unused-vars
        bytes calldata data,
        address sender,
        IState stateContract
    ) public view override returns (IRequestValidator.ResponseField[] memory) {
        (
            uint256 userID
        ) = abi.decode(proof, (uint256));

        _verifyEthIdentity(userID, sender);
        IRequestValidator.ResponseField[] memory signals = new IRequestValidator.ResponseField[](1);
        signals[0] = IRequestValidator.ResponseField({name: "userID", value: userID});
        return signals;
    }


    function _getState() internal view returns (IState) {
        return _getEthIdentityValidatorBaseStorage().state;
    }

    function _verifyEthIdentity(
        uint256 id,
        address sender
    ) internal view {
        bytes2 idType = _getState().getIdTypeIfSupported(id);
        uint256 calcId = GenesisUtils.calcIdFromEthAddress(idType, sender);
        require(calcId == id, "Sender is not owner of the ethereum identity");
    }
}
