import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { poseidonContract } from "circomlibjs";
import { Poseidon2AtModule, Poseidon3AtModule } from "./contractsAt";

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
  const poseidon2Element = m.useModule(Poseidon2AtModule).contract;
  const poseidon3Element = m.useModule(Poseidon3AtModule).contract;

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
