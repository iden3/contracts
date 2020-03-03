const BabyJubJub = artifacts.require("../contracts/lib/BabyJubJub");
const EddsaBabyJubJub = artifacts.require("../contracts/lib/EddsaBabyJubJub");

module.exports = function(deployer) {
  deployer.deploy(BabyJubJub);
  deployer.link(BabyJubJub, EddsaBabyJubJub);
};
