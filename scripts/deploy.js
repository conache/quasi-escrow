const { ethers } = require("hardhat");

async function verifyContractNoArgs(address) {
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [],
    });
  } catch (err) {
    console.log("error while verifying contract:", err);
  }
}

async function verifyContractWithArgs(address, ...args) {
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [...args],
    });
  } catch (err) {
    console.log("error while verifying contract:", err);
  }
}

async function deployContracts() {
  console.log("Deploying EscrowToken contract...");

  const EscrowTokenFactory = await ethers.getContractFactory("EscrowToken");
  escrowToken = await EscrowTokenFactory.deploy("EscrowToken", "EKT");
  console.log("EscrowToken deployed to:", escrowToken.address);

  console.log("\n\nDeploying LegalAgreement contract...");
  const LegalAgreementFactory = await ethers.getContractFactory("LegalAgreement");
  legalAgreement = await LegalAgreementFactory.deploy();
  console.log("LegalAgreement deployed to:", legalAgreement.address);

  console.log("\nVerifying EscrowToken contract...");
  await verifyContractWithArgs(escrowToken.address, "EscrowToken", "EKT");

  console.log("\nVerifying LegalAgreement contract...");
  await verifyContractNoArgs(legalAgreement.address);
}

deployContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
