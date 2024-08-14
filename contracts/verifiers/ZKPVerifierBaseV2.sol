// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./ZKPVerifierBase.sol";

struct ZKPResponse {
    uint64 requestId;
    bytes zkProof;
    bytes crossChainProof;
    bytes data;
}

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
        ZKPResponse[] memory responses
    ) public {
        ZKPVerifierV2Storage storage $ = _getZKPVerifierV2Storage();

        for (uint256 i = 0; i < responses.length; i++) {
            ZKPResponse memory response = responses[i];

            $._stateCrossChain.processProof(response.crossChainProof);

            (
                uint256[] memory inputs,
                uint256[2] memory a,
                uint256[2][2] memory b,
                uint256[2] memory c
            ) = abi.decode(response.zkProof, (uint256[], uint256[2], uint256[2][2], uint256[2]));

            submitZKPResponse(response.requestId, inputs, a, b, c);

            if (response.data.length > 0) {
                Metadata[] memory meta = abi.decode(response.data, (Metadata[]));

                ProofV2 storage proof = $._proofs[_msgSender()][response.requestId];
                for (uint256 j = 0; j < meta.length; j++) {
                    // TODO check the Poseidon Sponge hash
                    // require(meta[j].value == expectedValue || meta[j].signature == expectedSignature, "Invalid metadata");
                    proof.metadata[meta[j].key] = meta[j].value;
                }
            }
        }
    }
}

