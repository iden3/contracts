import { DID } from "@iden3/js-iden3-core";
import { ethers } from "hardhat";
import { byteEncoder, calculateCoreSchemaHash } from "@0xpolygonid/js-sdk";
import { Path } from "@iden3/js-jsonld-merklization";
import { VCPayment, VCPayment__factory } from "../../typechain-types";

const lsContext = `{
  "@context": [
    {
      "@version": 1.1,
      "@protected": true,
      "id": "@id",
      "type": "@type",
      "AnimaProofOfIdentity": {
        "@id": "https://raw.githubusercontent.com/anima-protocol/claims-polygonid/main/schemas/json-ld/poi-v2.json-ld#AnimaProofOfIdentity",
        "@context": {
          "@version": 1.1,
          "@protected": true,
          "id": "@id",
          "type": "@type",
          "kyc-vocab": "https://github.com/anima-protocol/claims-polygonid/blob/main/credentials/poi.md#",
          "xsd": "http://www.w3.org/2001/XMLSchema#",
          "firstname": {
            "@id": "kyc-vocab:firstname",
            "@type": "xsd:string"
          },
          "lastname": {
            "@id": "kyc-vocab:lastname",
            "@type": "xsd:string"
          },
          "date_of_birth_str": {
            "@id": "kyc-vocab:date_of_birth_str",
            "@type": "xsd:string"
          },
          "date_of_birth": {
            "@id": "kyc-vocab:date_of_birth",
            "@type": "xsd:integer"
          },
          "nationality": {
            "@id": "kyc-vocab:nationality",
            "@type": "xsd:string"
          },
          "document_country": {
            "@id": "kyc-vocab:document_country",
            "@type": "xsd:string"
          },
          "document_type": {
            "@id": "kyc-vocab:document_type",
            "@type": "xsd:string"
          },
          "document_number": {
            "@id": "kyc-vocab:document_number",
            "@type": "xsd:string"
          },
          "document_expiration_str": {
            "@id": "kyc-vocab:document_expiration_str",
            "@type": "xsd:string"
          },
          "document_expiration": {
            "@id": "kyc-vocab:document_expiration",
            "@type": "xsd:integer"
          },
          "kyc_validated": {
            "@id": "kyc-vocab:kyc_validated",
            "@type": "xsd:boolean"
          },
          "kyc_aml_validated": {
            "@id": "kyc-vocab:kyc_aml_validated",
            "@type": "xsd:boolean"
          },
          "document_country_code": {
            "@id": "kyc-vocab:document_country_code",
            "@type": "xsd:integer"
          }
        }
      }
    }
  ]
}`;
const type = `AnimaProofOfIdentity`;

async function main() {
  const contractAddress = "0xba83D99c87358Ef9B6f7c4a5A94021A58d870704";
  const issuerDID = "did:iden3:privado:main:2ScrbEuw9jLXMapW3DELXBbDco5EURzJZRN1tYj7L7";
  const issuerWithdrawAddress = "0xB1885A84C53f22587a3e49A27e8C92c8d6B44374";
  const ownerPartPercent = 10;
  const valueInEther = "3.6";

  const valueWei = ethers.parseUnits(valueInEther, "ether");
  const [owner] = await ethers.getSigners();
  const paymentFactory = new VCPayment__factory(owner);
  const payment = (await paymentFactory.attach(contractAddress)) as unknown as VCPayment;

  const issuerId = DID.idFromDID(DID.parse(issuerDID));

  const schemaId: string = await Path.getTypeIDFromContext(lsContext, type);

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
