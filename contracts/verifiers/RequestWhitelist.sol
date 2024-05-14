// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ICircuitValidator} from "../interfaces/ICircuitValidator.sol";

contract RequestWhitelist {
    /// @custom:storage-location iden3.storage.RequestWhitelist
    struct RequestWhitelistStorage {
        mapping(ICircuitValidator => bool isApproved) _approvedValidators;
    }

    // keccak256(abi.encode(uint256(keccak256("iden3.storage.RequestWhitelist")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant RequestWhitelistStorageLocation =
        0x0b183b95365de3d2a7ef33b94096df712936b2114cf9d40478ab41bbd8f9c800;

    function _getRequestWhitelistStorage()
        private
        pure
        returns (RequestWhitelistStorage storage $)
    {
        assembly {
            $.slot := RequestWhitelistStorageLocation
        }
    }

    function isApprovedValidator(ICircuitValidator validator) public view virtual returns (bool) {
        return _getRequestWhitelistStorage()._approvedValidators[validator];
    }

    function _approveValidator(ICircuitValidator validator) internal {
        require(
            IERC165(address(validator)).supportsInterface(type(ICircuitValidator).interfaceId),
            "Validator doesn't support relevant interface"
        );

        _getRequestWhitelistStorage()._approvedValidators[validator] = true;
    }
}
