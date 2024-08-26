// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";
import {IStateWithTimestampGetters} from "../interfaces/IStateWithTimestampGetters.sol";

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
        uint256[] calldata inputs,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        bytes calldata data,
        address sender
    ) external pure override returns (ICircuitValidator.KeyToInputValue[] memory) {
        ICircuitValidator.KeyToInputValue[] memory keypair;
        return keypair;
    }

    function verifyV2(
        bytes calldata zkProof,
        bytes calldata data,
        address sender,
        IStateWithTimestampGetters state
    ) external pure override returns (ICircuitValidator.KeyToInputValue[] memory) {
        ICircuitValidator.KeyToInputValue[] memory keypair;
        return keypair;
    }

    function inputIndexOf(string memory /*name*/) external pure returns (uint256) {
        return 0;
    }

    function getSupportedCircuitIds() external view returns (string[] memory ids) {
        return circuitIds;
    }
}
