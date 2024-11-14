// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./Strings.sol";
import "hardhat/console.sol";

library ExpressionParserLib {
    using strings for *;

    uint8 constant OPCODE_CONST = 0;
    uint8 constant OPCODE_LP = 1;
    uint8 constant OPCODE_RP = 2;
    uint8 constant OPCODE_AND = 100;
    uint8 constant OPCODE_OR = 101;

    bytes32 constant keccakOR = keccak256(bytes("||"));
    bytes32 constant keccakAND = keccak256(bytes("&&"));
    bytes32 constant keccakLP = keccak256(bytes("("));
    bytes32 constant keccakRP = keccak256(bytes(")"));

    // Following reference from shunting yard algorithm for parsing mathematical 
    // or logic expressions (https://en.wikipedia.org/wiki/Shunting_yard_algorithm)
    // https://tylerpexton-70687.medium.com/the-shunting-yard-algorithm-b840844141b2
    function parse(string memory expression) public pure returns(uint256[] memory) {
        strings.slice memory s = expression.toSlice();
        strings.slice memory delim = " ".toSlice();

        uint256[] memory output = new uint256[](s.count(delim)*2 + 1);
        uint256[] memory stack = new uint256[](s.count(delim) + 1);

        uint256 i_o = 0;
        uint256 i_s = 0;

        string[] memory parts = new string[](s.count(delim) + 1);
        for(uint256 i = 0; i < parts.length; i++) {
            parts[i] = s.split(delim).toString();

            bytes32 keccakPart = keccak256(bytes(parts[i]));
            if ((keccakPart == keccakAND) || 
                (keccakPart == keccakOR) || 
                (keccakPart == keccakLP) || 
                (keccakPart == keccakRP)) {

                uint256 opcode = 0; 

                if (keccakPart == keccakLP) {                    
                    opcode = OPCODE_LP;
                }
                if (keccakPart == keccakRP) {                    
                    opcode = OPCODE_RP;
                }
                if (keccakPart == keccakAND) {                    
                    opcode = OPCODE_AND;
                }
                if (keccakPart == keccakOR) {
                    opcode = OPCODE_OR;
                }

                if (opcode == OPCODE_AND || opcode == OPCODE_OR) {
                    while (i_s > 0 && stack[i_s - 1] <= opcode && stack[i_s - 1] != OPCODE_LP) {
                        output[i_o] = stack[i_s - 1];
                        i_o++;
                        stack[i_s - 1] = 0;
                        i_s--;
                    }
                }

                if (opcode != OPCODE_RP) { 
                    stack[i_s] = opcode;
                    i_s++;
                } else {
                    while (i_s>0 && stack[i_s - 1] != OPCODE_LP) {
                        output[i_o] = stack[i_s-1];
                        i_o++;
                        stack[i_s-1] = 0;
                        i_s--;
                    }
                    if (i_s>0 && stack[i_s - 1] == OPCODE_LP) {
                        stack[i_s - 1] = 0;
                        i_s--;
                    }
                }
            } else {
                (uint256 number, bool err) = strToUint(parts[i]);
                if (!err) {
                    output[i_o] = OPCODE_CONST;
                    i_o++;
                    output[i_o] = number;
                    i_o++;
                }
            }
        }

        for (uint256 i = i_s; i>0; i--) {
            output[i_o] = stack[i-1];
            i_o++;            
        }

        uint256[] memory outputFinal = new uint256[](i_o);
        for (uint256 i = 0; i<i_o; i++) {
            outputFinal[i] = output[i];
        }

        return outputFinal;
    }

    function strToUint(string memory _str) private pure returns(uint256 res, bool err) {   
        for (uint256 i = 0; i < bytes(_str).length; i++) {
            if ((uint8(bytes(_str)[i]) - 48) < 0 || (uint8(bytes(_str)[i]) - 48) > 9) {
                return (0, true);
            }
            res += (uint8(bytes(_str)[i]) - 48) * 10**(bytes(_str).length - i - 1);
        }
        
        return (res, false);
    }

    function calculate(uint256[] memory expression) public pure returns(uint256) {
        uint256[] memory stack = new uint256[](expression.length);
        console.log("Expression length: ", expression.length);        

        uint256 i_e = 0; // for the expression
        uint256 i_s = 0; // for the stack
        while (i_e < expression.length) {
            console.log("Current opcode: ", expression[i_e]);

            if (expression[i_e] == OPCODE_CONST) {
                stack[i_s] = expression[i_e + 1];
                console.log("Stack (push): ", stack[i_s]);
                i_e = i_e + 2;
                i_s++;
            } else {
                if (expression[i_e] == OPCODE_AND) {
                    console.log("Stack (pop): ", stack[i_s - 1], stack[i_s - 2], "*");
                    //TODO: For testing "*". Need to calculate AND
                    stack[i_s - 2] = stack[i_s - 1] * stack[i_s - 2];   
                    console.log("Stack result: ", stack[i_s - 2], i_s - 2);
                    i_s--;
                }
                if (expression[i_e] == OPCODE_OR) {
                    console.log("Stack (pop): ", stack[i_s - 1], stack[i_s - 2], "+");
                    //TODO: For testing "+". Need to calculate OR
                    stack[i_s - 2] = stack[i_s - 1] + stack[i_s - 2];
                    console.log("Stack result: ", stack[i_s - 2], i_s - 2);
                    i_s--;
                }
                i_e++;
            }
        }
        
        console.log("End", stack[0]);
        return stack[0];
    }

}
