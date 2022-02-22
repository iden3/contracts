// const BabyJubJub = artifacts.require("../contracts/lib/BabyJubJub");
// const EddsaBabyJubJub = artifacts.require("../contracts/lib/EddsaBabyJubJub");
const SchemaUrlRegistry = artifacts.require("../contracts/SchemaUrlRegistry");


module.exports = async  function(deployer) {
  await deployer.deploy(SchemaUrlRegistry);
  const schemaInstance = await SchemaUrlRegistry.deployed();
  console.log("address schema: ", schemaInstance.address);

};
