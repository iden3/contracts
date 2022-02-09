// const BabyJubJub = artifacts.require("../contracts/lib/BabyJubJub");
// const EddsaBabyJubJub = artifacts.require("../contracts/lib/EddsaBabyJubJub");
const Verifier = artifacts.require("../contracts/lib/Verifier");

module.exports = async function(deployer) {
   await deployer.deploy(Verifier);
   const verifierInstance = await Verifier.deployed();
   console.log("address verifier: ", verifierInstance.address);
};
