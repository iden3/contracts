import { Signer } from "ethers";
import { network } from "hardhat";

const { ethers } = await network.connect();

export async function transferOwnership(signer: Signer, contractAt: any) {
  const maxFeePerGas = 250000000000;
  const etherAmount = ethers.parseEther("10");

  console.log("Proxy Admin owner: ", await contractAt.proxyAdmin.owner());
  console.log("Proxy owner: ", await contractAt.proxy.owner());
  console.log("Transferring ownership of Proxy Admin and Proxy to: ", await signer.getAddress());

  const proxyAdminOwnerSigner = await ethers.getImpersonatedSigner(
    await contractAt.proxyAdmin.owner(),
  );
  const proxyOwnerSigner = await ethers.getImpersonatedSigner(await contractAt.proxy.owner());

  // transfer some ether to the proxy admin owner and state owner to pay for the transaction fees
  await signer.sendTransaction({
    to: proxyAdminOwnerSigner.address,
    value: etherAmount,
    maxFeePerGas,
  });

  const tx1 = await contractAt.proxyAdmin
    .connect(proxyAdminOwnerSigner)
    .transferOwnership(await signer.getAddress());
  await tx1.wait();

  const tx2 = await contractAt.proxy.connect(proxyOwnerSigner).transferOwnership(await signer.getAddress());
  await tx2.wait();

  const tx3 = await contractAt.proxy.connect(signer).acceptOwnership();
  await tx3.wait();
}
