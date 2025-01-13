// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IState} from "../interfaces/IState.sol";

/**
 * @dev RequestValidatorV3Stub validator
 */
contract RequestValidatorV3Stub is IRequestValidator, ERC165 {
    string public constant VERSION = "1.0.0-mock";

    struct CredentialAtomicQueryV3 {
        uint256 schema;
        uint256 claimPathKey;
        uint256 operator;
        uint256 slotIndex;
        uint256[] value;
        uint256 queryHash;
        uint256[] allowedIssuers;
        string[] circuitIds;
        bool skipClaimRevocationCheck;
        uint256 groupID;
        uint256 nullifierSessionID;
        uint256 proofType;
        uint256 verifierID;
    }

    function version() public pure override returns (string memory) {
        return VERSION;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IRequestValidator).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function verify(
        bytes calldata,
        bytes calldata,
        address,
        IState
    ) external pure override returns (IRequestValidator.ResponseField[] memory) {
        IRequestValidator.ResponseField[] memory signals = new IRequestValidator.ResponseField[](3);
        signals[0].name = "userID";
        signals[0].value = 1;
        signals[1].name = "issuerID";
        signals[1].value = 2;
        signals[2].name = "linkID";
        signals[2].value = 3;
        return signals;
    }

    function getRequestParams(
        bytes calldata params
    ) external pure override returns (IRequestValidator.RequestParams memory) {
        CredentialAtomicQueryV3 memory credAtomicQuery = abi.decode(
            params,
            (CredentialAtomicQueryV3)
        );
        return
            IRequestValidator.RequestParams({
                groupID: credAtomicQuery.groupID,
                verifierID: credAtomicQuery.verifierID,
                nullifierSessionID: credAtomicQuery.nullifierSessionID
            });
    }
}
