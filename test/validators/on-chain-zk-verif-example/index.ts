import { ethers } from "hardhat";
import { prepareInputs } from "../../utils/deploy-utils";
import { expect } from "chai";

describe("On chain ZK verifier validator", function () {
  let token: any;

  before(async () => {
    token = await deployOnChainZKVerifierExampleToken("kycToken", "KYC");
  });

  it("Should send to an address, which has ZK proof submitted before", async () => {
    const receiver = (await ethers.getSigners())[0];

    await token.mint(receiver.address, 10);
  });

  it("Should NOT send to an address, which has ZK proof submitted before", async () => {
    const receiver = (await ethers.getSigners())[1];

    await expect(token.mint(receiver.address, 10)).to.be.revertedWith(
      "only identities who provided proof are allowed to receive tokens"
    );
    await expect(token.transfer(receiver.address, 10)).to.be.revertedWith(
      "only identities who provided proof are allowed to receive tokens"
    );
  });
});

async function deployOnChainZKVerifierExampleToken(name: string, symbol: string) {
  const OnChainZKVerifierExampleToken = await ethers.getContractFactory(
    "ERC20OnchainExampleVerifier"
  );
  const onChainZKVerifierExampleToken = await OnChainZKVerifierExampleToken.deploy(name, symbol);
  await onChainZKVerifierExampleToken.deployed();

  const Verifier = await ethers.getContractFactory("VerifierOnChainZKExampleWrapper");
  const verifier = await Verifier.deploy();
  await verifier.deployed();

  const Validator = await ethers.getContractFactory("OnChainZKExampleValidator");
  const validator = await Validator.deploy(verifier.address);
  await validator.deployed();

  const params = [
    "4720763745722683616702324599137259461509439547324750011830105416383780791263", // issuerPubKeyAx
    "4844030361230692908091131578688419341633213823133966379083981236400104720538", // issuerPubKeyAy
    "18", // userMinAge
  ];
  await onChainZKVerifierExampleToken.setZKPRequest(1, validator.address, params);

  const { inputs, pi_a, pi_b, pi_c } = prepareInputs(require("./data/proof.json"));

  await onChainZKVerifierExampleToken.submitZKPResponse(
    1,
    inputs,
    pi_a,
    pi_b,
    pi_c,
  );

  return onChainZKVerifierExampleToken;
}
