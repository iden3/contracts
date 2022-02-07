// const BabyJubJub = artifacts.require("../contracts/lib/BabyJubJub");
// const EddsaBabyJubJub = artifacts.require("../contracts/lib/EddsaBabyJubJub");
const State = artifacts.require("../contracts/State");
const Verifier = artifacts.require("../contracts/lib/Verifier");


module.exports = async  function(deployer) {
  const verifierInstance = await Verifier.deployed();
  await deployer.deploy(State,verifierInstance.address);
  const stateInstance = await State.deployed();

  console.log("address state: ", stateInstance.address);

};
