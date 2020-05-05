// const BabyJubJub = artifacts.require("../contracts/lib/BabyJubJub");
// const EddsaBabyJubJub = artifacts.require("../contracts/lib/EddsaBabyJubJub");
const Verifier = artifacts.require("../contracts/lib/Verifier");

module.exports = function(deployer) {
  deployer.deploy(Verifier);
  // deployer.deploy(BabyJubJub);
  // deployer.link(BabyJubJub, EddsaBabyJubJub);
};
