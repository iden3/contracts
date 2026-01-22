import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { poseidonContract } from "circomlibjs";

export const Poseidon1Module = buildModule("Poseidon1Module", (m) => {
  const nInputs = 1;
  const abi = poseidonContract.generateABI(nInputs);
  const bytecode = poseidonContract.createCode(nInputs);
  const contractName = "Poseidon1Element";

  const poseidon = m.contract(contractName, {
    abi: abi,
    contractName: contractName,
    bytecode: bytecode,
    sourceName: "",
    linkReferences: {},
  });
  return { poseidon };
});

export const Poseidon2Module = buildModule("Poseidon2Module", (m) => {
  const nInputs = 2;
  const abi = poseidonContract.generateABI(nInputs);
  const bytecode = poseidonContract.createCode(nInputs);
  const contractName = "Poseidon2Element";

  const poseidon = m.contract(contractName, {
    abi: abi,
    contractName: contractName,
    bytecode: bytecode,
    sourceName: "",
    linkReferences: {},
  });
  return { poseidon };
});

export const Poseidon3Module = buildModule("Poseidon3Module", (m) => {
  const nInputs = 3;
  const abi = poseidonContract.generateABI(nInputs);
  const bytecode = poseidonContract.createCode(nInputs);
  const contractName = "Poseidon3Element";

  const poseidon = m.contract(contractName, {
    abi: abi,
    contractName: contractName,
    bytecode: bytecode,
    sourceName: "",
    linkReferences: {},
  });
  return { poseidon };
});

export const Poseidon4Module = buildModule("Poseidon4Module", (m) => {
  const nInputs = 4;
  const abi = poseidonContract.generateABI(nInputs);
  const bytecode = poseidonContract.createCode(nInputs);
  const contractName = "Poseidon4Element";

  const poseidon = m.contract(contractName, {
    abi: abi,
    contractName: contractName,
    bytecode: bytecode,
    sourceName: "",
    linkReferences: {},
  });
  return { poseidon };
});

export const Poseidon5Module = buildModule("Poseidon5Module", (m) => {
  const nInputs = 5;
  const abi = poseidonContract.generateABI(nInputs);
  const bytecode = poseidonContract.createCode(nInputs);
  const contractName = "Poseidon5Element";

  const poseidon = m.contract(contractName, {
    abi: abi,
    contractName: contractName,
    bytecode: bytecode,
    sourceName: "",
    linkReferences: {},
  });
  return { poseidon };
});

export const Poseidon6Module = buildModule("Poseidon6Module", (m) => {
  const nInputs = 6;
  const abi = poseidonContract.generateABI(nInputs);
  const bytecode = poseidonContract.createCode(nInputs);
  const contractName = "Poseidon6Element";

  const poseidon = m.contract(contractName, {
    abi: abi,
    contractName: contractName,
    bytecode: bytecode,
    sourceName: "",
    linkReferences: {},
  });
  return { poseidon };
});

export const SmtLibModule = buildModule("SmtLibModule", (m) => {
  const poseidon2Element = m.useModule(Poseidon2Module).poseidon;
  const poseidon3Element = m.useModule(Poseidon3Module).poseidon;

  const smtLib = m.contract("SmtLib", [], {
    libraries: {
      PoseidonUnit2L: poseidon2Element,
      PoseidonUnit3L: poseidon3Element,
    },
  });
  return { smtLib };
});

export const SpongePoseidonModule = buildModule("SpongePoseidonModule", (m) => {
  const poseidon6Element = m.useModule(Poseidon6Module).poseidon;

  const spongePoseidon = m.contract("SpongePoseidon", [], {
    libraries: {
      PoseidonUnit6L: poseidon6Element,
    },
  });
  return { spongePoseidon };
});

export const PoseidonFacadeModule = buildModule("PoseidonFacadeModule", (m) => {
  const poseidon1Element = m.useModule(Poseidon1Module).poseidon;
  const poseidon2Element = m.useModule(Poseidon2Module).poseidon;
  const poseidon3Element = m.useModule(Poseidon3Module).poseidon;
  const poseidon4Element = m.useModule(Poseidon4Module).poseidon;
  const poseidon5Element = m.useModule(Poseidon5Module).poseidon;
  const poseidon6Element = m.useModule(Poseidon6Module).poseidon;

  const spongePoseidon = m.useModule(SpongePoseidonModule).spongePoseidon;

  const poseidonFacade = m.contract("PoseidonFacade", [], {
    libraries: {
      PoseidonUnit1L: poseidon1Element,
      PoseidonUnit2L: poseidon2Element,
      PoseidonUnit3L: poseidon3Element,
      PoseidonUnit4L: poseidon4Element,
      PoseidonUnit5L: poseidon5Element,
      PoseidonUnit6L: poseidon6Element,
      SpongePoseidon: spongePoseidon,
    },
  });

  return { poseidonFacade };
});
