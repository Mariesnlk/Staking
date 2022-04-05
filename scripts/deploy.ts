import { ethers } from "hardhat";

async function main() {
  const Token = await ethers.getContractFactory("StakingToken");
  const token = await Token.deploy("Staking Token", "STTK", 1000000000);
  await token.deployed();
  console.log("Token deployed to:", token.address);

  const Vendor = await ethers.getContractFactory("Vendor");
  const vendor = await Vendor.deploy(token.address);
  await vendor.deployed();
  console.log("Vendor deployed to:", vendor.address);

  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(token.address);
  await staking.deployed();
  console.log("Staking deployed to:", staking.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
