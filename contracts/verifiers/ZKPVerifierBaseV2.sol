// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./ZKPVerifierBase.sol";

contract ZKPVerifierBaseV2 is ZKPVerifierBase {
    struct ProofV2 {
        mapping(string key => bytes) metadata;
    }

    /// @custom:storage-location erc7201:iden3.storage.ZKPVerifierBaseV2
    struct ZKPVerifierV2Storage {
        mapping(address user => mapping(uint64 requestID => ProofV2)) _proofs;
        IStateCrossChain _stateCrossChain;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.ZKPVerifierBaseV2")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 internal constant ZKPVerifierV2StorageLocation =
        0xe40b36a77dfc1323e72020f271931d3b1359b1c66f504d384cfbefe7cabd2700;

    /// @dev Get the main storage using assembly to ensure specific storage location
    function _getZKPVerifierV2Storage() private pure returns (ZKPVerifierV2Storage storage $) {
        assembly {
            $.slot := ZKPVerifierV2StorageLocation
        }
    }

    function __ZKPVerifierBase_init(IStateCrossChain _stateCrossChain) public initializer {
        ZKPVerifierV2Storage storage $ = _getZKPVerifierV2Storage();
        $._stateCrossChain = IStateCrossChain(_stateCrossChain);
    }

    function submitZKPResponseV2(
        uint64 requestId,
        bytes calldata zkProof, // groth16
        bytes calldata crossChainProof, // oracleType1
        bytes calldata data // selectiveDisclosure
    ) public {

        // CHECK CrossChainProof

        ZKPVerifierV2Storage storage s = _getZKPVerifierV2Storage();
        s._stateCrossChain.processProof(crossChainProof);

        // CHECK ZKProof

        (uint256[] memory inputs, uint256[2] memory a, uint256[2][2] memory b, uint256[2] memory c)
        = abi.decode(zkProof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

        submitZKPResponse(requestId, inputs, a, b, c);

        // SAVE METADATA

        if (data.length > 0) {
            (Metadata[] memory meta) = abi.decode(data, (Metadata[]));

            ProofV2 storage proof = _getZKPVerifierV2Storage()._proofs[_msgSender()][requestId];
            for (uint256 i = 0; i < meta.length; i++) {
                // TODO check the Poseidon Sponge hash
                //            require(meta[i].value ==  or sig or ... )
                proof.metadata[meta[i].key] = meta[i].value;
            }
        }
    }
}
