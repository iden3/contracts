import { AnonAadhaarDeployHelper } from "../../helpers/DeployAnonAadharV1Validator";
import { DeployHelper } from "../../helpers/DeployHelper";
import { contractsInfo } from "../../helpers/constants";
import { getStateContractAddress } from "../../helpers/helperUtils";
import { Id, DID } from "@iden3/js-iden3-core";
import { Merklizer } from "@iden3/js-jsonld-merklization";
import { ethers } from "hardhat";

const requestId = 23095784;

async function main() {
  const stDeployHelper = await DeployHelper.initialize();
  const { defaultIdType } = await stDeployHelper.getDefaultIdType();

  const stateContractAddress = getStateContractAddress();

  const verifierLib = await stDeployHelper.deployVerifierLib();
  const identityLib = await stDeployHelper.deployIdentityLib(
    contractsInfo.SMT_LIB.unifiedAddress,
    contractsInfo.POSEIDON_3.unifiedAddress,
    contractsInfo.POSEIDON_4.unifiedAddress,
  );

  const f = await AnonAadhaarDeployHelper.initialize();
  const issuer = await f.deployAnonAadhaarIssuerV1(
    await verifierLib.getAddress(),
    await identityLib.getAddress(),
    await stateContractAddress,
    defaultIdType,
  );
  await f.setZKPRequest(issuer, requestId, stateContractAddress);

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  const contractId = await issuer.getId();
  const issuerId = Id.fromBigInt(contractId);
  const issuerDid = DID.parseFromId(issuerId);
  const hashv = await Merklizer.hashValue("", issuerDid.string());
  await f.setIssuerDidHash(issuer, hashv.toString());

  console.log("AnonAadhaar deployed at: ", await issuer.getAddress());
  console.log("Issuer DID was attached to the contract: ", issuerDid.string(), hashv.toString());
  console.log(
    "Revocation status info:",
    `${issuerDid.string()}/credentialStatus?contractAddress=${chainId}:${await issuer.getAddress()}`,
  );
  console.log("Request Id: ", requestId);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
