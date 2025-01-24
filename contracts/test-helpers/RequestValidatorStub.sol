// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";
import {IState} from "../interfaces/IState.sol";

/**
 * @dev RequestValidatorStub validator
 */
contract RequestValidatorStub is IRequestValidator, ERC165 {
    string public constant VERSION = "1.0.0-stub";

    mapping(bytes32 hashParams => IRequestValidator.RequestParams requestParams)
        private requestParams;
    IRequestValidator.ResponseField[] private responseFields;

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
    ) external view returns (IRequestValidator.ResponseField[] memory) {
        return responseFields;
    }

    function stub_setVerifyResults(
        IRequestValidator.ResponseField[] calldata _responseFields
    ) external {
        delete responseFields;
        for (uint256 i = 0; i < _responseFields.length; i++) {
            responseFields.push(_responseFields[i]);
        }
    }

    function getRequestParams(
        bytes calldata params
    ) external view returns (IRequestValidator.RequestParams memory) {
        return requestParams[keccak256(params)];
    }

    function stub_setRequestParams(
        bytes[] calldata _params,
        IRequestValidator.RequestParams[] calldata _requestParams
    ) external {
        for (uint256 i = 0; i < _params.length; i++) {
            requestParams[keccak256(_params[i])] = _requestParams[i];
        }
    }
}
