import { DID } from "@iden3/js-iden3-core";
import { ethers } from "hardhat";
import { VCPayment, VCPayment__factory } from "../../typechain-types";

async function main() {
  const contractAddress = "0xba83D99c87358Ef9B6f7c4a5A94021A58d870704";
  const issuerDID = "did:polygonid:polygon:main:2q29vfwp5MriX7J7NVwL118AXzPQis6T3GFBBCTjfA";
  const issuerWithdrawAddress = ""; // todo: add isser withdraw address
  const ownerPartPercent = 15;
  const valueInEther = "6.48";

  const valueWei = ethers.parseUnits(valueInEther, "ether");
  const [owner] = await ethers.getSigners();
  const paymentFactory = new VCPayment__factory(owner);
  const payment = (await paymentFactory.attach(contractAddress)) as unknown as VCPayment;

  const issuerId = DID.idFromDID(DID.parse(issuerDID));

  const schemaHash = BigInt("294429364092372416894481372256149492350");

  const tx = await payment.setPaymentValue(
    issuerId.bigInt(),
    schemaHash,
    valueWei,
    ownerPartPercent,
    issuerWithdrawAddress,
  );
  console.log(tx.hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
