import { expect } from "chai";
import { prepareInputs, publishState } from "../../utils/state-utils";
import { packV3ValidatorParams } from "../../utils/validator-pack-utils";
import { calculateQueryHashV3 } from "../../utils/query-hash-utils";
import { CircuitId } from "@0xpolygonid/js-sdk";
import { chainIdInfoMap, contractsInfo, TEN_YEARS } from "../../../helpers/constants";
import { packZKProof } from "../../utils/packData";
import { network } from "hardhat";
import CredentialAtomicQueryV3StableValidatorModule from "../../../ignition/modules/deployEverythingBasicStrategy/credentialAtomicQueryV3StableValidator";
import { getChainId } from "../../../helpers/helperUtils";
import issuerFromGenesisStateToFirstTransitionV3 from "../common-data/issuer_from_genesis_state_to_first_transition_v3.json";
import userFromGenesisStateToFirstTransitionV3 from "../common-data/user_from_genesis_state_to_first_transition_v3.json";
import issuerFromFirstStateToSecondTransitionV3 from "../common-data/issuer_from_first_state_to_second_transition_v3.json";
import userFromFirstStateToSecondTransitionV3 from "../common-data/user_from_first_state_to_second_transition_v3.json";
import issuerFromGenesisStateToFirstAuthDisabledTransitionV3 from "../common-data/issuer_from_genesis_state_to_first_auth_disabled_transition_v3.json";
import validBjjUserGenesisV3 from "./data/valid_bjj_user_genesis_v3.json";
import invalidBjjUserGenesisV3 from "./data/invalid_bjj_user_genesis_v3.json";
import validBjjUserFirstV3 from "./data/valid_bjj_user_first_v3.json";
import validBjjUserFirstIssuerSecondV3 from "./data/valid_bjj_user_first_issuer_second_v3.json";
import validBjjUserSecondIssuerFirstV3 from "./data/valid_bjj_user_second_issuer_first_v3.json";
import validBjjUserGenesisAuthDisabledV3 from "./data/valid_bjj_user_genesis_auth_disabled_v3.json";
import validMtpUserGenesisV3 from "./data/valid_mtp_user_genesis_v3.json";
import invalidMtpUserGenesisV3 from "./data/invalid_mtp_user_genesis_v3.json";
import validMtpUserFirstV3 from "./data/valid_mtp_user_first_v3.json";
import validMtpUserFirstIssuerSecondV3 from "./data/valid_mtp_user_first_issuer_second_v3.json";
import validMtpUserSecondIssuerFirstV3 from "./data/valid_mtp_user_second_issuer_first_v3.json";
import validMtpUserGenesisAuthDisabledV3 from "./data/valid_mtp_user_genesis_auth_disabled_v3.json";
import validBjjUserGenesisAuthDisabledV3WrongId from "./data/valid_bjj_user_genesis_auth_disabled_v3_wrong_id.json";
import validMtpUserGenesisAuthDisabledV3WrongId from "./data/valid_mtp_user_genesis_auth_disabled_v3_wrong_id.json";
import validBjjUserFirstIssuerGenesisV3 from "./data/valid_bjj_user_first_issuer_genesis_v3.json";

import validBjjUserGenesisV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_bjj_user_genesis_v3.json";
import invalidBjjUserGenesisV3_16_16_64_16_32 from "./data-16-16-64-16-32/invalid_bjj_user_genesis_v3.json";
import validBjjUserFirstV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_bjj_user_first_v3.json";
import validBjjUserFirstIssuerSecondV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_bjj_user_first_issuer_second_v3.json";
import validBjjUserSecondIssuerFirstV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_bjj_user_second_issuer_first_v3.json";
import validBjjUserGenesisAuthDisabledV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_bjj_user_genesis_auth_disabled_v3.json";
import validMtpUserGenesisV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_mtp_user_genesis_v3.json";
import invalidMtpUserGenesisV3_16_16_64_16_32 from "./data-16-16-64-16-32/invalid_mtp_user_genesis_v3.json";
import validMtpUserFirstV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_mtp_user_first_v3.json";
import validMtpUserFirstIssuerSecondV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_mtp_user_first_issuer_second_v3.json";
import validMtpUserSecondIssuerFirstV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_mtp_user_second_issuer_first_v3.json";
import validMtpUserGenesisAuthDisabledV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_mtp_user_genesis_auth_disabled_v3.json";
import validBjjUserGenesisAuthDisabledV3WrongId_16_16_64_16_32 from "./data-16-16-64-16-32/valid_bjj_user_genesis_auth_disabled_v3_wrong_id.json";
import validMtpUserGenesisAuthDisabledV3WrongId_16_16_64_16_32 from "./data-16-16-64-16-32/valid_mtp_user_genesis_auth_disabled_v3_wrong_id.json";
import validBjjUserFirstIssuerGenesisV3_16_16_64_16_32 from "./data-16-16-64-16-32/valid_bjj_user_first_issuer_genesis_v3.json";

const { ethers, networkHelpers, ignition } = await network.connect();

const tenYears = TEN_YEARS;
const testCases: any[] = [
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in published onchain. Revocation State is published onchain. BJJ Proof",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: validBjjUserGenesisV3,
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "Validation of Sig proof failed",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: invalidBjjUserGenesisV3,
    errorMessage: "ProofIsNotValid()",
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "User state is not genesis but latest",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
    ],

    proofJson: validBjjUserFirstV3,
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "The non-revocation issuer state is latest",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
      issuerFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validBjjUserFirstIssuerSecondV3,
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "The non-revocation issuer state is expired",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
      issuerFromFirstStateToSecondTransitionV3,
      userFromFirstStateToSecondTransitionV3,
    ],
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    proofJson: validBjjUserSecondIssuerFirstV3,
    setRevStateExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "NonRevocationStateOfIssuerIsExpired()",
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "GIST root expired, Issuer revocation state is not expired",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3, // proof was generated after this state transition
      issuerFromFirstStateToSecondTransitionV3,
      userFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validBjjUserFirstV3,

    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    setGISTRootExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "GistRootIsExpired()",
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "The generated proof is expired",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
      issuerFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validBjjUserFirstV3,
    errorMessage: "GeneratedProofIsOutdated()",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: validBjjUserGenesisV3,
    setProofExpiration: tenYears,
    allowedIssuers: [123n],
    errorMessage: "IssuerIsNotOnTheAllowedIssuersList()",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (UserID correspond to the sender)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23013175891893363078841232968022302880776034013620341061794940968520126978n,
      },
      {
        name: "linkID",
        value: 19823993270096139446564592922993947503208333537792611306066620392561342309875n,
      },
      {
        name: "nullifier",
        value: 0n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  // MTP Proofs
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain. MTP Proof.",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: validMtpUserGenesisV3,
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "Validation of MTP proof failed",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: invalidMtpUserGenesisV3,
    errorMessage: "ProofIsNotValid()",
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "User state is not genesis but latest. MTP Proof.",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
    ],
    proofJson: validMtpUserFirstV3,
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "The non-revocation issuer state is not expired. MTP Proof.",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3, //  // proof was generated after this state transition
      issuerFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validMtpUserFirstIssuerSecondV3,
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "The non-revocation issuer state is expired. MTP Proof.",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3, //  // proof was generated after this state transition
      issuerFromFirstStateToSecondTransitionV3,
      userFromFirstStateToSecondTransitionV3,
    ],
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    proofJson: validMtpUserSecondIssuerFirstV3,
    setRevStateExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "NonRevocationStateOfIssuerIsExpired()",
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "GIST root expired, Issuer revocation state is not expired. MTP Proof.",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3, // proof was generated after this state transition
      issuerFromFirstStateToSecondTransitionV3,
      userFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validMtpUserFirstV3,
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    setGISTRootExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "GistRootIsExpired()",
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "The generated proof is expired. MTP Proof.",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
      issuerFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validMtpUserFirstV3,
    errorMessage: "GeneratedProofIsOutdated()",
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain. MTP Proof.",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: validMtpUserGenesisV3,
    setProofExpiration: tenYears,
    allowedIssuers: [123n],
    errorMessage: "IssuerIsNotOnTheAllowedIssuersList()",
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Valid MTP genesis proof with isBJJAuthEnabled=0 (UserID correspond to the sender)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validMtpUserGenesisAuthDisabledV3,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23013175891893363078841232968022302880776034013620341061794940968520126978n,
      },
      {
        name: "linkID",
        value: 19823993270096139446564592922993947503208333537792611306066620392561342309875n,
      },
      {
        name: "nullifier",
        value: 0n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  // Auth Disabled. UserID does NOT correspond to the sender
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (UserID does NOT correspond to the sender)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3WrongId,
    setProofExpiration: tenYears,
    errorMessage: "UserIDDoesNotCorrespondToTheSender()",
    ethereumBasedUser: true,
    sender: "0x6edFa588aFd58803F728AbC91984c69528C00854",
  },
  {
    name: "Valid MTP genesis proof with isBJJAuthEnabled=0 (UserID does NOT correspond to the sender)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validMtpUserGenesisAuthDisabledV3WrongId,
    setProofExpiration: tenYears,
    errorMessage: "UserIDDoesNotCorrespondToTheSender()",
    ethereumBasedUser: true,
    isMtpProof: true,
    sender: "0x6edFa588aFd58803F728AbC91984c69528C00854",
  },
  // Issuer Genesis State
  {
    name: "Validate First User State, Issuer Genesis. BJJ Proof",
    stateTransitions: [userFromGenesisStateToFirstTransitionV3],
    proofJson: validBjjUserFirstIssuerGenesisV3,
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  // Wrong challenge
  {
    name: "Validate First User State, Issuer Genesis. BJJ Proof (Challenge should match the sender)",
    stateTransitions: [userFromGenesisStateToFirstTransitionV3],
    proofJson: validBjjUserFirstIssuerGenesisV3,
    errorMessage: "ChallengeShouldMatchTheSender()",
    setProofExpiration: tenYears,
    sender: "0x0000000000000000000000000000000000000000",
  },
  // Invalid Link ID pub signal
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Invalid Link ID pub signal)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage:
      "InvalidGroupIDOrLinkID(0, 19823993270096139446564592922993947503208333537792611306066620392561342309875)",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    groupID: 0,
  },
  // Proof type should match the requested one in query
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Proof type should match the requested one in query)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage: "ProofTypeShouldMatchTheRequestedOneInQuery()",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    isMtpProof: true,
  },
  // Invalid nullify pub signal
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Invalid nullify pub signal)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage: "InvalidNullifyPubSignal()",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    nullifierSessionId: "2",
  },
  // Query hash does not match the requested one
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Query hash does not match the requested one)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage:
      "QueryHashDoesNotMatchTheRequestedOne(0, 19185468473610285815446195195707572856383167010831244369191309337886545428382)",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    queryHash: BigInt(0),
  },
];

const testCases_16_16_64_16_32: any[] = [
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in published onchain. Revocation State is published onchain. BJJ Proof (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: validBjjUserGenesisV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "Validation of Sig proof failed (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: invalidBjjUserGenesisV3_16_16_64_16_32,
    errorMessage: "ProofIsNotValid()",
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "User state is not genesis but latest (16_16_64_16_32)",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
    ],

    proofJson: validBjjUserFirstV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "The non-revocation issuer state is latest (16_16_64_16_32)",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
      issuerFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validBjjUserFirstIssuerSecondV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "The non-revocation issuer state is expired (16_16_64_16_32)",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
      issuerFromFirstStateToSecondTransitionV3,
      userFromFirstStateToSecondTransitionV3,
    ],
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    proofJson: validBjjUserSecondIssuerFirstV3_16_16_64_16_32,
    setRevStateExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "NonRevocationStateOfIssuerIsExpired()",
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "GIST root expired, Issuer revocation state is not expired (16_16_64_16_32)",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3, // proof was generated after this state transition
      issuerFromFirstStateToSecondTransitionV3,
      userFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validBjjUserFirstV3_16_16_64_16_32,

    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    setGISTRootExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "GistRootIsExpired()",
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "The generated proof is expired (16_16_64_16_32)",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
      issuerFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validBjjUserFirstV3_16_16_64_16_32,
    errorMessage: "GeneratedProofIsOutdated()",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: validBjjUserGenesisV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    allowedIssuers: [123n],
    errorMessage: "IssuerIsNotOnTheAllowedIssuersList()",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (UserID correspond to the sender) (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23013175891893363078841232968022302880776034013620341061794940968520126978n,
      },
      {
        name: "linkID",
        value: 19823993270096139446564592922993947503208333537792611306066620392561342309875n,
      },
      {
        name: "nullifier",
        value: 0n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  // MTP Proofs
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain. MTP Proof. (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: validMtpUserGenesisV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "Validation of MTP proof failed (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: invalidMtpUserGenesisV3_16_16_64_16_32,
    errorMessage: "ProofIsNotValid()",
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "User state is not genesis but latest. MTP Proof. (16_16_64_16_32)",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
    ],
    proofJson: validMtpUserFirstV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "The non-revocation issuer state is not expired. MTP Proof. (16_16_64_16_32)",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3, //  // proof was generated after this state transition
      issuerFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validMtpUserFirstIssuerSecondV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  {
    name: "The non-revocation issuer state is expired. MTP Proof. (16_16_64_16_32)",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3, //  // proof was generated after this state transition
      issuerFromFirstStateToSecondTransitionV3,
      userFromFirstStateToSecondTransitionV3,
    ],
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    proofJson: validMtpUserSecondIssuerFirstV3_16_16_64_16_32,
    setRevStateExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "NonRevocationStateOfIssuerIsExpired()",
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "GIST root expired, Issuer revocation state is not expired. MTP Proof. (16_16_64_16_32)",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3, // proof was generated after this state transition
      issuerFromFirstStateToSecondTransitionV3,
      userFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validMtpUserFirstV3_16_16_64_16_32,
    stateTransitionDelayMs: 2000, // [1....][2....][3....][4....] - each block is 2 seconds long
    setGISTRootExpiration: 3, // [1....][2....][3..*.][4....] <-- (*) - marks where the expiration threshold is
    errorMessage: "GistRootIsExpired()",
    setProofExpiration: tenYears,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "The generated proof is expired. MTP Proof. (16_16_64_16_32)",
    stateTransitions: [
      issuerFromGenesisStateToFirstTransitionV3,
      userFromGenesisStateToFirstTransitionV3,
      issuerFromFirstStateToSecondTransitionV3,
    ],
    proofJson: validMtpUserFirstV3_16_16_64_16_32,
    errorMessage: "GeneratedProofIsOutdated()",
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Validate Genesis User State. Issuer Claim IdenState is in Chain. Revocation State is in Chain. MTP Proof. (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstTransitionV3],
    proofJson: validMtpUserGenesisV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    allowedIssuers: [123n],
    errorMessage: "IssuerIsNotOnTheAllowedIssuersList()",
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  {
    name: "Valid MTP genesis proof with isBJJAuthEnabled=0 (UserID correspond to the sender) (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validMtpUserGenesisAuthDisabledV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    isMtpProof: true,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23013175891893363078841232968022302880776034013620341061794940968520126978n,
      },
      {
        name: "linkID",
        value: 19823993270096139446564592922993947503208333537792611306066620392561342309875n,
      },
      {
        name: "nullifier",
        value: 0n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  // Auth Disabled. UserID does NOT correspond to the sender
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (UserID does NOT correspond to the sender) (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3WrongId_16_16_64_16_32,
    setProofExpiration: tenYears,
    errorMessage: "UserIDDoesNotCorrespondToTheSender()",
    ethereumBasedUser: true,
    sender: "0x6edFa588aFd58803F728AbC91984c69528C00854",
  },
  {
    name: "Valid MTP genesis proof with isBJJAuthEnabled=0 (UserID does NOT correspond to the sender) (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validMtpUserGenesisAuthDisabledV3WrongId_16_16_64_16_32,
    setProofExpiration: tenYears,
    errorMessage: "UserIDDoesNotCorrespondToTheSender()",
    ethereumBasedUser: true,
    isMtpProof: true,
    sender: "0x6edFa588aFd58803F728AbC91984c69528C00854",
  },
  // Issuer Genesis State
  {
    name: "Validate First User State, Issuer Genesis. BJJ Proof (16_16_64_16_32)",
    stateTransitions: [userFromGenesisStateToFirstTransitionV3],
    proofJson: validBjjUserFirstIssuerGenesisV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    signalValues: [
      {
        name: "userID",
        value: 23273167900576580892722615617815475823351560716009055944677723144398443009n,
      },
      {
        name: "linkID",
        value: 21264956840473518295367401759082248638554058714792654964349049745455799782226n,
      },
      {
        name: "nullifier",
        value: 21540438192236855564075143333896114176485819065040531615519987653057866936972n,
      },
      { name: "timestamp", value: 1642074362n },
      {
        name: "issuerID",
        value: 22057981499787921734624217749308316644136637822444794206796063681866502657n,
      },
      {
        name: "isEmbeddedAuthVerified",
        value: 1,
      },
    ],
  },
  // Wrong challenge
  {
    name: "Validate First User State, Issuer Genesis. BJJ Proof (Challenge should match the sender) (16_16_64_16_32)",
    stateTransitions: [userFromGenesisStateToFirstTransitionV3],
    proofJson: validBjjUserFirstIssuerGenesisV3_16_16_64_16_32,
    errorMessage: "ChallengeShouldMatchTheSender()",
    setProofExpiration: tenYears,
    sender: "0x0000000000000000000000000000000000000000",
  },
  // Invalid Link ID pub signal
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Invalid Link ID pub signal) (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage:
      "InvalidGroupIDOrLinkID(0, 19823993270096139446564592922993947503208333537792611306066620392561342309875)",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    groupID: 0,
  },
  // Proof type should match the requested one in query
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Proof type should match the requested one in query) (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage: "ProofTypeShouldMatchTheRequestedOneInQuery()",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    isMtpProof: true,
  },
  // Invalid nullify pub signal
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Invalid nullify pub signal) (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage: "InvalidNullifyPubSignal()",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    nullifierSessionId: "2",
  },
  // Query hash does not match the requested one
  {
    name: "Valid BJJ genesis proof with isBJJAuthEnabled=0 (Query hash does not match the requested one) (16_16_64_16_32)",
    stateTransitions: [issuerFromGenesisStateToFirstAuthDisabledTransitionV3],
    proofJson: validBjjUserGenesisAuthDisabledV3_16_16_64_16_32,
    setProofExpiration: tenYears,
    ethereumBasedUser: true,
    errorMessage:
      "QueryHashDoesNotMatchTheRequestedOne(0, 19185468473610285815446195195707572856383167010831244369191309337886545428382)",
    sender: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    queryHash: BigInt(0),
  },
];

describe("Atomic V3-Stable Validator", function () {
  let state: any, v3Validator;

  async function deployContractsFixture() {
    const chainId = await getChainId();
    const oracleSigningAddress = chainIdInfoMap.get(chainId)?.oracleSigningAddress;

    const parameters: any = {
      CrossChainProofValidatorModule: {
        domainName: "StateInfo",
        signatureVersion: "1",
        oracleSigningAddress: oracleSigningAddress,
      },
      StateProxyModule: {
        defaultIdType: "0x0112",
      },
    };

    const { state: stateContract, credentialAtomicQueryV3StableValidator: validator } =
      await ignition.deploy(CredentialAtomicQueryV3StableValidatorModule, {
        parameters: parameters,
      });

    return {
      stateContract,
      validator,
    };
  }

  function checkSignals(signals: any, signalValues: any[]) {
    expect(signals.length).to.be.equal(6);

    for (let i = 0; i < signals.length; i++) {
      const signalValue = signalValues.find((signalValue) => signalValue.name === signals[i][0]);
      expect(signalValue.value).to.be.equal(signals[i][1]);
    }
  }

  async function executeTest(test: any, circuitId: string) {
    for (let i = 0; i < test.stateTransitions.length; i++) {
      if (test.stateTransitionDelayMs) {
        await networkHelpers.time.increase(test.stateTransitionDelayMs);
      }
      await publishState(ethers, state, test.stateTransitions[i]);
    }

    const value = ["20010101", ...new Array(63).fill("0")];

    const schema = "267831521922558027206082390043321796944";
    const slotIndex = test.isMtpProof ? 2 : 0;
    const operator = 2;
    const claimPathKey =
      "20376033832371109177683048456014525905119173674985843915445634726167450989630";
    const valueArrSize = 1;
    const nullifierSessionId = test.ethereumBasedUser ? "0" : "1234569";
    const verifierId = "21929109382993718606847853573861987353620810345503358891473103689157378049";
    const queryHash = calculateQueryHashV3(
      value,
      schema,
      slotIndex,
      operator,
      claimPathKey,
      valueArrSize,
      1,
      1,
      verifierId,
      nullifierSessionId,
    );

    const query = {
      schema,
      claimPathKey,
      operator,
      slotIndex,
      value,
      circuitIds: [circuitId],
      skipClaimRevocationCheck: false,
      queryHash: test.queryHash == undefined ? queryHash : test.queryHash,
      groupID: test.groupID == undefined ? 1 : test.groupID,
      nullifierSessionID:
        test.nullifierSessionId == undefined ? nullifierSessionId : test.nullifierSessionId,
      proofType: test.isMtpProof ? 2 : 1,
      verifierID: verifierId,
    };

    const { inputs, pi_a, pi_b, pi_c } = prepareInputs(test.proofJson);
    if (test.setProofExpiration) {
      await v3Validator.setProofExpirationTimeout(test.setProofExpiration);
    }
    if (test.setRevStateExpiration) {
      await v3Validator.setRevocationStateExpirationTimeout(test.setRevStateExpiration);
    }
    if (test.setGISTRootExpiration) {
      await v3Validator.setGISTRootExpirationTimeout(test.setGISTRootExpiration);
    }

    const data = packV3ValidatorParams(query, test.allowedIssuers);

    const metadata = ethers.AbiCoder.defaultAbiCoder().encode(["string"], [circuitId]);

    // Check verify function
    const zkProof = packZKProof(inputs, pi_a, pi_b, pi_c);
    if (test.errorMessage) {
      await expect(v3Validator.verify(test.sender, zkProof, data, metadata)).to.be.rejectedWith(
        test.errorMessage,
      );
    } else if (test.errorMessage === "") {
      await expect(v3Validator.verify(test.sender, zkProof, data, metadata)).to.be.reverted;
    } else {
      const signals = await v3Validator.verify(test.sender, zkProof, data, metadata);

      checkSignals(signals, test.signalValues);
    }
  }

  beforeEach(async () => {
    ({ stateContract: state, validator: v3Validator } =
      await networkHelpers.loadFixture(deployContractsFixture));
  });

  describe(`Tests for circuitId ${CircuitId.AtomicQueryV3OnChainStable}`, function () {
    for (const test of testCases) {
      it(test.name, async function () {
        this.timeout(50000);
        await executeTest(test, CircuitId.AtomicQueryV3OnChainStable);
      });
    }
  });

  describe(`Tests for circuitId credentialAtomicQueryV3OnChain-16-16-64-16-32`, function () {
    for (const test of testCases_16_16_64_16_32) {
      it(test.name, async function () {
        this.timeout(50000);
        await executeTest(test, "credentialAtomicQueryV3OnChain-16-16-64-16-32");
      });
    }
  });

  it("check version", async () => {
    const version = await v3Validator.version();
    expect(version).to.be.equal(contractsInfo.VALIDATOR_V3_STABLE.version);
  });

  it("check getRequestParam", async () => {
    const query: any = {
      requestId: 1,
      schema: 2,
      claimPathKey: 3,
      operator: 4,
      slotIndex: 0,
      queryHash: 5,
      value: [20020101, ...new Array(63).fill(0)], // for operators 1-3 only first value matters
      circuitIds: ["circuitName"],
      skipClaimRevocationCheck: false,
      claimPathNotExists: 0,
      allowedIssuers: [],
      verifierID: 7,
      nullifierSessionID: 8,
      groupID: 9,
      proofType: 0,
    };

    const params = packV3ValidatorParams(query);
    let resultParam = await v3Validator.getRequestParam(params, "groupID");
    expect(resultParam).to.deep.equal(["groupID", 9]);
    resultParam = await v3Validator.getRequestParam(params, "verifierID");
    expect(resultParam).to.deep.equal(["verifierID", 7]);
    resultParam = await v3Validator.getRequestParam(params, "nullifierSessionID");
    expect(resultParam).to.deep.equal(["nullifierSessionID", 8]);
  });

  it("Test get config params", async () => {
    const oneHour = 3600;
    const expirationTimeout = await v3Validator.getProofExpirationTimeout();
    const revocationStateExpirationTimeout =
      await v3Validator.getRevocationStateExpirationTimeout();
    const gistRootExpirationTimeout = await v3Validator.getGISTRootExpirationTimeout();
    expect(expirationTimeout).to.be.equal(oneHour);
    expect(revocationStateExpirationTimeout).to.be.equal(oneHour);
    expect(gistRootExpirationTimeout).to.be.equal(oneHour);
  });

  it("Test supported circuits", async () => {
    const supportedCircuitIds = await v3Validator.getSupportedCircuitIds();
    expect(supportedCircuitIds.length).to.be.equal(2);
    expect(supportedCircuitIds[0]).to.be.equal(CircuitId.AtomicQueryV3OnChainStable);
    expect(supportedCircuitIds[1]).to.be.equal("credentialAtomicQueryV3OnChain-16-16-64-16-32");
  });
});
