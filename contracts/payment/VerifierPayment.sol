// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

contract VerifierPayment {
    address public verifier;
    uint256 public totalDeposit;

    // Mapping to track used nonces to avoid replay attacks
    mapping(bytes32 => bool) public usedNonces;

    // EIP712 Domain Separator and type hash
    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    bytes32 public constant WITHDRAW_TYPEHASH =
        keccak256(
            "Withdraw(address issuer,uint256 amount,uint256 expiration,uint256 nonce)"
        );
    bytes32 public DOMAIN_SEPARATOR;

    constructor(address _verifier) {
        verifier = _verifier;
        totalDeposit = 0;

        // Set up the EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256("VerifierPayment"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    // Function for Verifier to deposit tokens into the contract
    function deposit() external payable {
        require(msg.sender == verifier, "Only the verifier can deposit");
        totalDeposit += msg.value;
    }

    // Verifies EIP-712 signature and allows Issuer to withdraw funds
    function withdraw(
        address issuer,
        uint256 amount,
        uint256 expiration,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp < expiration, "Signature expired");
        require(totalDeposit >= amount, "Insufficient contract balance");

        // Hash the withdrawal details according to the EIP-712 typed data format
        bytes32 structHash = keccak256(
            abi.encode(WITHDRAW_TYPEHASH, issuer, amount, expiration, nonce)
        );

        // Hash the full message with the domain separator
        bytes32 hash = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        // Recover the signer from the signature
        address signer = ecrecover(hash, v, r, s);
        require(signer == verifier, "Invalid signature");

        // Check that the nonce has not been used before
        require(!usedNonces[structHash], "Nonce already used");

        // Mark the nonce as used
        usedNonces[structHash] = true;

        // Update the total deposit and transfer the specified amount to the issuer
        totalDeposit -= amount;
        (bool success, ) = issuer.call{value: amount}("");
        require(success, "Transfer failed");
    }

    // Check the balance of the contract
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
