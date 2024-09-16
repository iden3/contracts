// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.26;

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

    // solhint-disable no-unused-vars
    function verify(
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        bytes calldata data,
        address sender
    ) external pure override returns (ICircuitValidator.Signal[] memory) {
        ICircuitValidator.Signal[] memory signals;
        return signals;
    }
    // solhint-enable no-unused-vars

    function verifyV2(
        bytes calldata zkProof,
        bytes calldata data,
        address sender,
        IState state
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
