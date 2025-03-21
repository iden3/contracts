// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.27;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IRequestValidator} from "../interfaces/IRequestValidator.sol";

/**
 * @dev RequestValidatorStub validator
 */
contract RequestValidatorStub is IRequestValidator, ERC165 {
    string public constant VERSION = "1.0.0-stub";

    mapping(bytes32 hashParams => IRequestValidator.RequestParam[] requestParams)
        private requestParams;
    IRequestValidator.ResponseField[] private responseFields;
    mapping(string => uint256) private _requestParamNameToIndex;
    mapping(string => uint256) private _inputNameToIndex;

    function version() public pure override returns (string memory) {
        return VERSION;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IRequestValidator).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function verify(
        address,
        bytes calldata,
        bytes calldata
    ) external view returns (IRequestValidator.ResponseField[] memory) {
        return responseFields;
    }

    // solhint-disable-next-line func-name-mixedcase
    function stub_setVerifyResults(
        IRequestValidator.ResponseField[] calldata _responseFields
    ) external {
        delete responseFields;
        for (uint256 i = 0; i < _responseFields.length; i++) {
            responseFields.push(_responseFields[i]);
        }
    }

    function getRequestParam(
        bytes calldata params,
        string memory paramName
    ) external view returns (RequestParam memory) {
        return requestParams[keccak256(params)][requestParamIndexOf(paramName)];
    }

    function requestParamIndexOf(string memory name) public view override returns (uint256) {
        uint256 index = _requestParamNameToIndex[name];
        if (index == 0) revert RequestParamNameNotFound();
        return --index; // we save 1-based index, but return 0-based
    }

    function inputIndexOf(string memory name) public view virtual returns (uint256) {
        uint256 index = _inputNameToIndex[name];
        if (index == 0) {
            revert InputNameNotFound();
        }
        return --index; // we save 1-based index, but return 0-based
    }

    // solhint-disable-next-line func-name-mixedcase
    function stub_setRequestParams(
        bytes[] calldata _params,
        IRequestValidator.RequestParam[][] calldata _requestParams
    ) external {
        for (uint256 i = 0; i < _params.length; i++) {
            delete requestParams[keccak256(_params[i])];

            for (uint256 j = 0; j < _requestParams[i].length; j++) {
                requestParams[keccak256(_params[i])].push(_requestParams[i][j]);
                _setRequestParamToIndex(_requestParams[i][j].name, j);
            }
        }
    }

    // solhint-disable-next-line func-name-mixedcase
    function stub_setInput(string memory inputName, uint256 index) external {
        _setInputToIndex(inputName, index);
    }

    function _setRequestParamToIndex(string memory requestParamName, uint256 index) internal {
        // increment index to avoid 0
        _requestParamNameToIndex[requestParamName] = ++index;
    }

    function _setInputToIndex(string memory inputName, uint256 index) internal {
        // increment index to avoid 0
        _inputNameToIndex[inputName] = ++index;
    }
}
