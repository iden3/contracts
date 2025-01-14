// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IAuthValidator} from "../interfaces/IAuthValidator.sol";
import {IState} from "../interfaces/IState.sol";

/**
 * @dev AuthValidatorStub validator
 */
contract AuthValidatorStub is IAuthValidator, ERC165 {
    string public constant VERSION = "1.0.0-mock";

    function version() public pure override returns (string memory) {
        return VERSION;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IAuthValidator).interfaceId || super.supportsInterface(interfaceId);
    }

    function verify(
        bytes calldata,
        bytes calldata,
        address,
        IState,
        bytes32
    ) external pure override returns (uint256 userID) {
        return 1;
    }
}
