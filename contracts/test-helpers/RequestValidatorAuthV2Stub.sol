// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IState} from "../interfaces/IState.sol";

/**
 * @dev RequestValidatorAuthV2Stub validator
 */
contract RequestValidatorAuthV2Stub is IRequestValidator, ERC165 {
    string public constant VERSION = "1.0.0-mock";

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
        IRequestValidator.ResponseField[] memory signals = new IRequestValidator.ResponseField[](1);
        signals[0].name = "userID";
        signals[0].value = 1;
        return signals;
    }

    function getGroupID(bytes calldata) external pure override returns (uint256) {
        revert("AuthV2 validator does not support groupId field");
    }

    function getGroupFieldHash(bytes calldata params) external pure override returns (bytes32) {
        revert("AuthV2 validator does not support groupId field");
    }

    function getVerifierId(bytes calldata) external pure override returns (uint256) {
        return 0;
    }
}
