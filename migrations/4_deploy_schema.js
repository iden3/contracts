// const BabyJubJub = artifacts.require("../contracts/lib/BabyJubJub");
// const EddsaBabyJubJub = artifacts.require("../contracts/lib/EddsaBabyJubJub");
const SchemaRegistry = artifacts.require("../contracts/SchemaRegistry");


module.exports = async  function(deployer) {
  await deployer.deploy(SchemaRegistry);
  const schemaInstance = await SchemaRegistry.deployed();
  console.log("address schema: ", schemaInstance.address);

};
