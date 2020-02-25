const EcArithmetic = artifacts.require("../contracts/lib/EcArithmetic");
const EddsaBabyJubJub = artifacts.require("../contracts/lib/EddsaBabyJubJub");

module.exports = function(deployer) {
  deployer.deploy(EcArithmetic);
  deployer.link(EcArithmetic, EddsaBabyJubJub);
};
