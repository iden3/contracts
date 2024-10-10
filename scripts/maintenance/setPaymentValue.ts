import { DID } from "@iden3/js-iden3-core";
import { ethers } from "hardhat";
import { byteEncoder, calculateCoreSchemaHash } from "@0xpolygonid/js-sdk";
import { Path } from "@iden3/js-jsonld-merklization";
import { VCPayment, VCPayment__factory } from "../../typechain-types";

const ldContextJSONAnimaProofOfUniqueness = `{
  "@context": [
    {
      "@version": 1.1,
      "@protected": true,
      "id": "@id",
      "type": "@type",
      "AnimaProofOfUniqueness": {
        "@id": "https://raw.githubusercontent.com/anima-protocol/claims-polygonid/main/schemas/json-ld/pou-v1.json-ld#AnimaProofOfUniqueness",
        "@context": {
          "@version": 1.1,
          "@protected": true,
          "id": "@id",
          "type": "@type",
          "kyc-vocab": "https://github.com/anima-protocol/claims-polygonid/blob/main/credentials/pou.md#",
          "xsd": "http://www.w3.org/2001/XMLSchema#",
          "unique": {
            "@id": "kyc-vocab:unique",
            "@type": "xsd:boolean"
          },
          "user_hash": {
            "@id": "kyc-vocab:user_hash",
            "@type": "xsd:string"
          },
          "reputation_level": {
            "@id": "kyc-vocab:reputation_level",
            "@type": "xsd:integer"
          },
          "last_verification_timestamp": {
            "@id": "kyc-vocab:last_verification_timestamp",
            "@type": "xsd:integer"
          },
          "last_verification_date": {
            "@id": "kyc-vocab:last_verification_date",
            "@type": "xsd:integer"
          }
        }
      }
    }
  ]
}`;
const typeNameAnimaProofOfUniqueness = "AnimaProofOfUniqueness";

const ldContextJSONAnimaProofOfLife = `{
  "@context": [
    {
      "@version": 1.1,
      "@protected": true,
      "id": "@id",
      "type": "@type",
      "AnimaProofOfLife": {
        "@id": "https://raw.githubusercontent.com/anima-protocol/claims-polygonid/main/schemas/json-ld/pol-v1.json-ld#AnimaProofOfLife",
        "@context": {
          "@version": 1.1,
          "@protected": true,
          "id": "@id",
          "type": "@type",
          "kyc-vocab": "https://github.com/anima-protocol/claims-polygonid/blob/main/credentials/pol.md#",
          "xsd": "http://www.w3.org/2001/XMLSchema#",
          "human": {
            "@id": "kyc-vocab:human",
            "@type": "xsd:boolean"
          }
        }
      }
    }
  ]
}`;
const typeNameAnimaProofOfLife = "AnimaProofOfLife";

const pathToCredentialSubject = "https://www.w3.org/2018/credentials#credentialSubject";

async function main() {
  const contractAddress = "0x4DB2Dc48987698c4C3A537f3D7f694DEAB2Ef388";
  const issuerDID = "did:iden3:privado:main:2ScrbEuw9jLXMapW3DELXBbDco5EURzJZRN1tYj7L7";
  const issuerWithdrawAddress = "0xE9D7fCDf32dF4772A7EF7C24c76aB40E4A42274a";
  const ownerPartPercent = 3;
  const valueInEther = "0.0003";

  const valueWei = ethers.parseUnits(valueInEther, "ether");
  const [owner] = await ethers.getSigners();
  const paymentFactory = new VCPayment__factory(owner);
  const payment = (await paymentFactory.attach(contractAddress)) as unknown as VCPayment;

  const issuerId = DID.idFromDID(DID.parse(issuerDID));

  const schemaId: string = await Path.getTypeIDFromContext(
    ldContextJSONAnimaProofOfUniqueness,
    typeNameAnimaProofOfUniqueness,
  );

  console.log("schemaId", schemaId);
  const schemaHash = calculateCoreSchemaHash(byteEncoder.encode(schemaId));
  console.log("schemaHash", schemaHash.bigInt());
  console.log("issuerId", issuerId.bigInt());

  const tx = await payment.setPaymentValue(
    issuerId.bigInt(),
    schemaHash.bigInt(),
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
