import { ethers, upgrades } from "hardhat";
import { StateDeployHelper } from "../../helpers/StateDeployHelper";
import { Contract } from "ethers";

export async function deployValidatorContracts(
  verifierContractWrapperName: string,
  validatorContractName: string
): Promise<{
  state: any;
  validator: any;
}> {
  const stateDeployHelper = await StateDeployHelper.initialize();
  const { state } = await stateDeployHelper.deployStateV2();

  const ValidatorContractVerifierWrapper = await ethers.getContractFactory(
    verifierContractWrapperName
  );
  const validatorContractVerifierWrapper =
    await ValidatorContractVerifierWrapper.deploy();

  await validatorContractVerifierWrapper.deployed();
  console.log(
    "Validator Verifier Wrapper deployed to:",
    validatorContractVerifierWrapper.address
  );

  const ValidatorContract = await ethers.getContractFactory(
    validatorContractName
  );

  const validatorContractProxy = await upgrades.deployProxy(ValidatorContract, [
    validatorContractVerifierWrapper.address,
    state.address,
  ]);

  await validatorContractProxy.deployed();
  console.log(
    `${validatorContractName} deployed to: ${validatorContractProxy.address}`
  );

  return {
    validator: validatorContractProxy,
    state,
  };
}

export async function deployERC20ZKPVerifierToken(
  name: string,
  symbol: string
): Promise<{
  address: string;
}> {
  const ERC20Verifier = await ethers.getContractFactory("ERC20Verifier");
  const erc20Verifier = await ERC20Verifier.deploy(name, symbol);

  await erc20Verifier.deployed();
  console.log("ERC20Verifier deployed to:", erc20Verifier.address);

  return erc20Verifier;
}

export interface VerificationInfo {
  inputs: Array<string>;
  pi_a: Array<string>;
  pi_b: Array<Array<string>>;
  pi_c: Array<string>;
}

export function prepareInputs(json: any): VerificationInfo {
  const { proof, pub_signals } = json;
  const { pi_a, pi_b, pi_c } = proof;
  const [[p1, p2], [p3, p4]] = pi_b;
  const preparedProof = {
    pi_a: pi_a.slice(0, 2),
    pi_b: [
      [p2, p1],
      [p4, p3],
    ],
    pi_c: pi_c.slice(0, 2),
  };

  return { inputs: pub_signals, ...preparedProof };
}

export function toBigNumber({ inputs, pi_a, pi_b, pi_c }: VerificationInfo) {
  return {
    inputs: inputs.map((input) => ethers.BigNumber.from(input)),
    pi_a: pi_a.map((input) => ethers.BigNumber.from(input)),
    pi_b: pi_b.map((arr) => arr.map((input) => ethers.BigNumber.from(input))),
    pi_c: pi_c.map((input) => ethers.BigNumber.from(input)),
  };
}

export async function publishState(
  state: Contract,
  json: { [key: string]: string }
): Promise<{
  oldState: string;
  newState: string;
  id: string;
  blockNumber: number;
  timestamp: number;
}> {
  const {
    inputs: [id, oldState, newState, isOldStateGenesis],
    pi_a,
    pi_b,
    pi_c,
  } = prepareInputs(json);

  const transitStateTx = await state.transitState(
    id,
    oldState,
    newState,
    isOldStateGenesis === "1",
    pi_a,
    pi_b,
    pi_c
  );

  const { blockNumber } = await transitStateTx.wait();
  const { timestamp } = await ethers.provider.getBlock(
    transitStateTx.blockNumber
  );

  return {
    oldState,
    newState,
    id,
    blockNumber,
    timestamp,
  };
}

export function toJson(data) {
  return JSON.stringify(data, (_, v) =>
    typeof v === "bigint" ? `${v}n` : v
  ).replace(/"(-?\d+)n"/g, (_, a) => a);
}
