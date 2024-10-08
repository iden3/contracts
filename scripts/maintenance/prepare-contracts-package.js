const util = require("util");
const exec = util.promisify(require("child_process").exec);

const buildFolder = "build";

const commands = [
  {
    name: "Clean Hardhat",
    command: "npx hardhat clean",
  },
  {
    name: "Compile Hardhat",
    command: "npx hardhat compile",
  },
  {
    name: `Delete ${buildFolder} folder`,
    command: `rm -rf ${buildFolder}`,
  },
  {
    name: `Create ${buildFolder} folder`,
    command: `mkdir ${buildFolder}`,
  },
  {
    name: `Create ${buildFolder}/contracts folder`,
    command: `mkdir ${buildFolder}/contracts`,
  },
  {
    name: "Copy artifacts",
    command: `find ../artifacts/contracts -type f -name "*.json" ! -name "*dbg.json" ! -path "../artifacts/contracts/test-helpers/*" -exec cp {} "${buildFolder}/contracts" \\;`,
  },
];

async function preparePackage() {
  for (const command of commands) {
    console.log(`Running: ${command.name}`);
    const { stdout, stderr } = await exec(command.command);
    console.log(command.command)
    stdout && console.log("stdout:", stdout);
    stderr && console.log("stderr:", stderr);
  }
}

preparePackage().catch((error) => {
  console.error(error);
  process.exit(1);
});
