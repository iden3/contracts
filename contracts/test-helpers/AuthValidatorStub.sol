// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IAuthValidator} from "../interfaces/IAuthValidator.sol";

/**
 * @dev AuthValidatorStub validator
 */
contract AuthValidatorStub is IAuthValidator, ERC165 {
    string public constant VERSION = "1.0.0-stub";

    uint256 private userID;

    function version() public pure override returns (string memory) {
        return VERSION;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IAuthValidator).interfaceId || super.supportsInterface(interfaceId);
    }

    function verify(
        address,
        bytes calldata,
        bytes calldata,
        bytes calldata
    ) external view override returns (uint256, AuthResponseField[] memory) {
        AuthResponseField[] memory authResponseFields = new AuthResponseField[](1);
        authResponseFields[0] = AuthResponseField("challenge", 1);
        return (userID, authResponseFields);
    }

    // solhint-disable-next-line func-name-mixedcase
    function stub_setVerifyResults(uint256 _userID) external {
        userID = _userID;
    }
}
