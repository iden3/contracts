// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.16;

import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {CredentialAtomicQueryValidator} from "../validators/CredentialAtomicQueryValidator.sol";

/// @title A common functions for validator query.
library PackUtils {
    function credentialAtomicQueryUnpack(
        ICircuitValidator.CircuitQuery calldata circuitQuery
    ) internal pure returns (CredentialAtomicQueryValidator.CredentialAtomicQuery memory) {
        uint256 schema = uint256(bytes32(circuitQuery.queryData));
        uint32 shitft = 32;
        uint256 claimPathKey = uint256(bytes32(circuitQuery.queryData[shitft:shitft + 32]));
        shitft += 32;
        uint256 operator = uint256(bytes32(circuitQuery.queryData[shitft:shitft + 32]));
        shitft += 32;
        uint256[] memory value = new uint256[](64);
        for (uint8 i = 0; i < 64; i++) {
            value[i] = uint256(bytes32(circuitQuery.queryData[shitft:shitft + 32]));
            shitft += 32;
        }

        uint256 queryHash = uint256(bytes32(circuitQuery.queryData[shitft:shitft + 32]));
        shitft += 32;
        uint256[] memory allowedIssuers = new uint256[](20);
        for (uint8 i = 0; i < 20; i++) {
            allowedIssuers[i] = uint256(bytes32(circuitQuery.queryData[shitft:shitft + 32]));
            shitft += 32;
        }
        CredentialAtomicQueryValidator.CredentialAtomicQuery
            memory result = CredentialAtomicQueryValidator.CredentialAtomicQuery({
                circuitId: circuitQuery.circuitId,
                metadata: circuitQuery.metadata,
                schema: schema,
                claimPathKey: claimPathKey,
                operator: operator,
                value: value,
                queryHash: queryHash,
                allowedIssuers: allowedIssuers
            });

        return result;
    }
}
