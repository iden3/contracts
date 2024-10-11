import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { contractsInfo } from "../../helpers/constants";

const contractName = contractsInfo.CREATE2_ADDRESS_ANCHOR.name;

export const Create2AddressAnchorModule = buildModule("Create2AddressAnchorModule", (m) => {
  // The bytecode, which is effectively deployed is 0x60006000F3 (last 5 bytes of the init bytecode),
  // which is PUSH1 0x00, PUSH1 0x00, RETURN.
  // That means that the contract will do nothing but accept any transaction without throwing an error.
  // So, it can be used as a first "dummy" implementation of contracts such as TransparentUpgradeableProxy,
  // which demand the first implementation address to have non-empty contract.

  const create2AddressAnchor = m.contract(contractName, {
    abi: [],
    contractName,
    bytecode: "0x6005600C60003960056000F360006000F3",
    sourceName: "",
    linkReferences: {},
  });

  return { create2AddressAnchor };
});

// THE CONTRACT DISASSEMBLER

// label_0000:
// 	// Inputs[1] { @000B  memory[0x00:0x05] }
// 	0000    60  PUSH1 0x05
// 	0002    60  PUSH1 0x0c
// 	0004    60  PUSH1 0x00
// 	0006    39  CODECOPY
// 	0007    60  PUSH1 0x05
// 	0009    60  PUSH1 0x00
// 	000B    F3  *RETURN
// 	// Stack delta = +0
// 	// Outputs[2]
// 	// {
// 	//     @0006  memory[0x00:0x05] = code[0x0c:0x11]
// 	//     @000B  return memory[0x00:0x05];
// 	// }
// 	// Block terminates
//
// 	000C    60    PUSH1 0x00
// 	000E    60    PUSH1 0x00
// 	0010    F3    *RETURN

// CODECOPY destOffset, offset, size
// RETURN offset, size
