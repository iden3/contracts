import { DeployHelper } from "../../../helpers/DeployHelper";
import { ethers } from "hardhat";


const proxyAdminAddress = "0x4862E19501BdDF875838b7780c2dcEa1713774f8";
const stateContractAddress = "0xF03116F78Ce803a778979B288A6620e9DC703A17";

const stateLibAddress = "0xF86f066441c43039Ebf73dDB694Da9AB9C5e49F8";
const smtLibAddress = "0x93772dDfebBF46670577FbeFDe7D80D8C8487796";
const poseidonUnit1LAddress = "0xA07803BE24640292FA21Ab28B12760B3DA8026f2";
const verifierAddress = "0xa6B209675817033d98BD564C085566c773f7C7EC";


async function main() {

  const stateDeployHelper = await DeployHelper.initialize(null,true);
  const stateOld = await ethers.getContractAt("State", stateContractAddress);

  let version = await stateOld.VERSION();
  console.log(version);

  // **** Upgrade State ****
  const { state } = await stateDeployHelper.upgradeState2(
    stateContractAddress,
    proxyAdminAddress,
    stateLibAddress,
    smtLibAddress,
    poseidonUnit1LAddress,
    verifierAddress
  );
  // ************************

  version = await state.VERSION();
  console.log(version);
  

  console.log("Contract Upgrade Finished");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
