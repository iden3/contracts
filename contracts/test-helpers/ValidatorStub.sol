// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IState} from "../interfaces/IState.sol";

/**
 * @dev ValidatorStub validator
 */
contract ValidatorStub is ICircuitValidator, ERC165 {
    string public constant VERSION = "2.0.1-mock";

    string internal constant CIRCUIT_ID = "mock-stub";

    string[] circuitIds = [CIRCUIT_ID];

    function version() public pure override returns (string memory) {
        return VERSION;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(ICircuitValidator).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function verify(
        uint256[] calldata,
        uint256[2] calldata,
        uint256[2][2] calldata,
        uint256[2] calldata,
        bytes calldata,
        address
    ) external pure override returns (ICircuitValidator.KeyToInputIndex[] memory) {
        ICircuitValidator.KeyToInputIndex[] memory keyToInputIndexes;
        return keyToInputIndexes;
    }

    function verifyV2(
        bytes calldata,
        bytes calldata,
        address,
        IState
    ) external pure override returns (ICircuitValidator.Signal[] memory) {
        ICircuitValidator.Signal[] memory signals;
        return signals;
    }

    function inputIndexOf(string memory /*name*/) external pure returns (uint256) {
        return 0;
    }

    function getSupportedCircuitIds() external view returns (string[] memory ids) {
        return circuitIds;
    }
}
