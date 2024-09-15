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
    ) external pure override returns (ICircuitValidator.Signal[] memory) {
        ICircuitValidator.Signal[] memory keypair;
        return keypair;
    }

    function verifyV2(
        bytes calldata zkProof,
        bytes calldata data,
        address sender,
        IStateWithTimestampGetters state
    ) external pure override returns (ICircuitValidator.Signal[] memory) {
        ICircuitValidator.Signal[] memory signals = new ICircuitValidator.Signal[](
            2
        );
        signals[0] = ICircuitValidator.Signal({
            name: "input1Name",
            value: 4738709701797800586552075642459921104723261125214325001991063996931581119544
        });
        signals[1] = ICircuitValidator.Signal({
            name: "input2Name",
            value: 9035405010444332688195156022077093661354129858083944503594910647512497655475
        });

        return signals;
    }

    function inputIndexOf(string memory /*name*/) external pure returns (uint256) {
        return 0;
    }

    function getSupportedCircuitIds() external view returns (string[] memory ids) {
        return circuitIds;
    }
}
