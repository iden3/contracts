pragma solidity ^0.8.4;

interface ICircuitValidator {
    /**
     * @dev Implements public inputs verification with optional parametrisation by params (if not empty),
     *      calls a ZK verification contract.
     * @param inputs the public inputs of the circuit
     * @param a the a part of ZK proof
     * @param b the b part of ZK proof
     * @param c the c part of ZK proof
     */
    function verify(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory params
    ) external view;

    /**
     * @dev Gets input index by name
     *
     * IMPORTANT: Note that the index is 0-based so avoid implementation mistakes for
     * missing indexes. It should rather throw but not return 0 value then.
     * The latter is, actually, the case, if input name -> index relation is implemented
     * as a mapping(string => uint256) in the contract.
     *
     * @param name The input name
     * @return the Input index
     */
    function inputIndexOf(string memory name) external view returns (uint256);
}
