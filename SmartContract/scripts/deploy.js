const hre = require("hardhat");

async function main() {
    const HealthDataContract = await hre.ethers.getContractFactory("HealthDataContract");
    const healthDataContract = await HealthDataContract.deploy();

    await healthDataContract.waitForDeployment(); // Correct way in latest ethers version

    console.log("HealthDataContract deployed to:", await healthDataContract.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
