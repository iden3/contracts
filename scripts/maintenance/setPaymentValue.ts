import { DID } from "@iden3/js-iden3-core";
import { ethers } from "hardhat";
import { byteEncoder, calculateCoreSchemaHash } from "@0xpolygonid/js-sdk";
import { Path } from "@iden3/js-jsonld-merklization";
import { VCPayment, VCPayment__factory } from "../../typechain-types";

const ldContextJSONAnimaProofOfUniqueness = `{
  "@context": [
    {
      "@protected": true,
      "@version": 1.1,
      "id": "@id",
      "type": "@type",
      "BasicPerson": {
        "@context": {
          "@propagate": true,
          "@protected": true,
          "polygon-vocab": "urn:uuid:bd42bba2-1caa-48b9-ab85-9509d33016bc#",
          "xsd": "http://www.w3.org/2001/XMLSchema#",
          "fullName": {
            "@id": "polygon-vocab:fullName",
            "@type": "xsd:string"
          },
          "firstName": {
            "@id": "polygon-vocab:firstName",
            "@type": "xsd:string"
          },
          "familyName": {
            "@id": "polygon-vocab:familyName",
            "@type": "xsd:string"
          },
          "middleName": {
            "@id": "polygon-vocab:middleName",
            "@type": "xsd:string"
          },
          "alsoKnownAs": {
            "@id": "polygon-vocab:alsoKnownAs",
            "@type": "xsd:string"
          },
          "dateOfBirth": {
            "@id": "polygon-vocab:dateOfBirth",
            "@type": "xsd:integer"
          },
          "governmentIdentifier": {
            "@id": "polygon-vocab:governmentIdentifier",
            "@type": "xsd:string"
          },
          "governmentIdentifierType": {
            "@id": "polygon-vocab:governmentIdentifierType",
            "@type": "xsd:string"
          },
          "gender": {
            "@id": "polygon-vocab:gender",
            "@type": "xsd:string"
          },
          "email": {
            "@id": "polygon-vocab:email",
            "@type": "xsd:string"
          },
          "sex": {
            "@id": "polygon-vocab:sex",
            "@type": "xsd:string"
          },
          "phoneNumber": {
            "@id": "polygon-vocab:phoneNumber",
            "@type": "xsd:double"
          },
          "phoneNumberVerified": {
            "@id": "polygon-vocab:phoneNumberVerified",
            "@type": "xsd:boolean"
          },
          "title": {
            "@id": "polygon-vocab:title",
            "@type": "xsd:string"
          },
          "salutation": {
            "@id": "polygon-vocab:salutation",
            "@type": "xsd:string"
          },
          "documentExpirationDate": {
            "@id": "polygon-vocab:documentExpirationDate",
            "@type": "xsd:integer"
          },
          "nameAndFamilyNameAtBirth": {
            "@context": {
              "firstName": {
                "@id": "polygon-vocab:firstName",
                "@type": "xsd:string"
              },
              "familyName": {
                "@id": "polygon-vocab:familyName",
                "@type": "xsd:string"
              }
            },
            "@id": "polygon-vocab:nameAndFamilyNameAtBirth"
          },
          "placeOfBirth": {
            "@context": {
              "locality": {
                "@id": "polygon-vocab:locality",
                "@type": "xsd:string"
              },
              "region": {
                "@id": "polygon-vocab:region",
                "@type": "xsd:string"
              },
              "countryCode": {
                "@id": "polygon-vocab:countryCode",
                "@type": "xsd:string"
              },
              "countryCodeNumber": {
                "@id": "polygon-vocab:countryCodeNumber",
                "@type": "xsd:integer"
              }
            },
            "@id": "polygon-vocab:placeOfBirth"
          },
          "addresses": {
            "@context": {
              "primaryAddress": {
                "@context": {
                  "addressLine1": {
                    "@id": "polygon-vocab:addressLine1",
                    "@type": "xsd:string"
                  },
                  "addressLine2": {
                    "@id": "polygon-vocab:addressLine2",
                    "@type": "xsd:string"
                  },
                  "locality": {
                    "@id": "polygon-vocab:locality",
                    "@type": "xsd:string"
                  },
                  "region": {
                    "@id": "polygon-vocab:region",
                    "@type": "xsd:string"
                  },
                  "countryCode": {
                    "@id": "polygon-vocab:countryCode",
                    "@type": "xsd:string"
                  },
                  "postalCode": {
                    "@id": "polygon-vocab:postalCode",
                    "@type": "xsd:string"
                  },
                  "countryCodeNumber": {
                    "@id": "polygon-vocab:countryCodeNumber",
                    "@type": "xsd:integer"
                  },
                  "unstructuredAddress": {
                    "@id": "polygon-vocab:unstructuredAddress",
                    "@type": "xsd:string"
                  }
                },
                "@id": "polygon-vocab:primaryAddress"
              },
              "homeAddress": {
                "@context": {
                  "addressLine1": {
                    "@id": "polygon-vocab:addressLine1",
                    "@type": "xsd:string"
                  },
                  "addressLine2": {
                    "@id": "polygon-vocab:addressLine2",
                    "@type": "xsd:string"
                  },
                  "locality": {
                    "@id": "polygon-vocab:locality",
                    "@type": "xsd:string"
                  },
                  "region": {
                    "@id": "polygon-vocab:region",
                    "@type": "xsd:string"
                  },
                  "countryCode": {
                    "@id": "polygon-vocab:countryCode",
                    "@type": "xsd:string"
                  },
                  "postalCode": {
                    "@id": "polygon-vocab:postalCode",
                    "@type": "xsd:string"
                  },
                  "countryCodeNumber": {
                    "@id": "polygon-vocab:countryCodeNumber",
                    "@type": "xsd:integer"
                  },
                  "unstructuredAddress": {
                    "@id": "polygon-vocab:unstructuredAddress",
                    "@type": "xsd:string"
                  }
                },
                "@id": "polygon-vocab:homeAddress"
              },
              "businessAddress": {
                "@context": {
                  "addressLine1": {
                    "@id": "polygon-vocab:addressLine1",
                    "@type": "xsd:string"
                  },
                  "addressLine2": {
                    "@id": "polygon-vocab:addressLine2",
                    "@type": "xsd:string"
                  },
                  "locality": {
                    "@id": "polygon-vocab:locality",
                    "@type": "xsd:string"
                  },
                  "region": {
                    "@id": "polygon-vocab:region",
                    "@type": "xsd:string"
                  },
                  "countryCode": {
                    "@id": "polygon-vocab:countryCode",
                    "@type": "xsd:string"
                  },
                  "postalCode": {
                    "@id": "polygon-vocab:postalCode",
                    "@type": "xsd:string"
                  },
                  "countryCodeNumber": {
                    "@id": "polygon-vocab:countryCodeNumber",
                    "@type": "xsd:integer"
                  },
                  "unstructuredAddress": {
                    "@id": "polygon-vocab:unstructuredAddress",
                    "@type": "xsd:string"
                  }
                },
                "@id": "polygon-vocab:businessAddress"
              },
              "mailingAddress": {
                "@context": {
                  "addressLine1": {
                    "@id": "polygon-vocab:addressLine1",
                    "@type": "xsd:string"
                  },
                  "addressLine2": {
                    "@id": "polygon-vocab:addressLine2",
                    "@type": "xsd:string"
                  },
                  "locality": {
                    "@id": "polygon-vocab:locality",
                    "@type": "xsd:string"
                  },
                  "region": {
                    "@id": "polygon-vocab:region",
                    "@type": "xsd:string"
                  },
                  "countryCode": {
                    "@id": "polygon-vocab:countryCode",
                    "@type": "xsd:string"
                  },
                  "postalCode": {
                    "@id": "polygon-vocab:postalCode",
                    "@type": "xsd:string"
                  },
                  "countryCodeNumber": {
                    "@id": "polygon-vocab:countryCodeNumber",
                    "@type": "xsd:integer"
                  },
                  "unstructuredAddress": {
                    "@id": "polygon-vocab:unstructuredAddress",
                    "@type": "xsd:string"
                  }
                },
                "@id": "polygon-vocab:mailingAddress"
              }
            },
            "@id": "polygon-vocab:addresses"
          },
          "nationalities": {
            "@context": {
              "nationality1CountryCode": {
                "@id": "polygon-vocab:nationality1CountryCode",
                "@type": "xsd:string"
              },
              "nationality2CountryCode": {
                "@id": "polygon-vocab:nationality2CountryCode",
                "@type": "xsd:string"
              },
              "nationality3CountryCode": {
                "@id": "polygon-vocab:nationality3CountryCode",
                "@type": "xsd:string"
              },
              "nationality1CountryCodeNumber": {
                "@id": "polygon-vocab:nationality1CountryCodeNumber",
                "@type": "xsd:integer"
              },
              "nationality2CountryCodeNumber": {
                "@id": "polygon-vocab:nationality2CountryCodeNumber",
                "@type": "xsd:integer"
              },
              "nationality3CountryCodeNumber": {
                "@id": "polygon-vocab:nationality3CountryCodeNumber",
                "@type": "xsd:integer"
              }
            },
            "@id": "polygon-vocab:nationalities"
          },
          "customFields": {
            "@context": {
              "string1": {
                "@id": "polygon-vocab:string1",
                "@type": "xsd:string"
              },
              "string2": {
                "@id": "polygon-vocab:string2",
                "@type": "xsd:string"
              },
              "string3": {
                "@id": "polygon-vocab:string3",
                "@type": "xsd:string"
              },
              "number1": {
                "@id": "polygon-vocab:number1",
                "@type": "xsd:double"
              },
              "number2": {
                "@id": "polygon-vocab:number2",
                "@type": "xsd:double"
              },
              "number3": {
                "@id": "polygon-vocab:number3",
                "@type": "xsd:double"
              },
              "boolean1": {
                "@id": "polygon-vocab:boolean1",
                "@type": "xsd:boolean"
              },
              "boolean2": {
                "@id": "polygon-vocab:boolean2",
                "@type": "xsd:boolean"
              },
              "boolean3": {
                "@id": "polygon-vocab:boolean3",
                "@type": "xsd:boolean"
              }
            },
            "@id": "polygon-vocab:customFields"
          }
        },
        "@id": "urn:uuid:0a9897de-0ec5-42df-9e19-dbbe410b2924"
      }
    }
  ]
}`;
const typeNameAnimaProofOfUniqueness = "BasicPerson";

async function main() {
  const contractAddress = "0xba83D99c87358Ef9B6f7c4a5A94021A58d870704";
  const issuerDID = "did:polygonid:polygon:main:2q29vfwp5MriX7J7NVwL118AXzPQis6T3GFBBCTjfA";
  const issuerWithdrawAddress = "0x690e79196c220c9ac707ec0a20fda7bfb58728f9";
  const ownerPartPercent = 15;
  const valueInEther = "6.48";

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
