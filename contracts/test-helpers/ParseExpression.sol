// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ExpressionParserLib} from "../lib/ExpressionParserLib.sol";
import "hardhat/console.sol";

contract ParseExpression {
     function parse(string memory expression) public pure {
        uint256[] memory output = ExpressionParserLib.parse(expression);
        for (uint256 i = 0; i < output.length; i++) {
            console.log("Output ", i, ":", output[i]);
        }
    }

    function calculate(string memory expression) public pure returns(uint256) {
        uint256[] memory expResult = ExpressionParserLib.parse(expression);
        uint256 result = ExpressionParserLib.calculate(expResult);
        return result;
    }
}

