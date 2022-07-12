pragma solidity ^0.8.0;

interface IERC20ZKP {

    struct CircuitQuery {
        uint256  schema ;
        uint256  slotIndex;
        uint256  operator;
        uint256[] value;
        string circuitId;
    }
    function transferWithProof(
        uint256[] memory inputs,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256 amount)
    external returns (bool);

    function getCircuitQuery() external view returns (CircuitQuery memory);

}
