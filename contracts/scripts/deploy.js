const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // USDT contract address (use appropriate address for network)
  let usdtAddress;
  const network = await ethers.provider.getNetwork();
  
  if (network.chainId === 1n) {
    // Mainnet USDT
    usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  } else if (network.chainId === 11155111n) {
    // Sepolia testnet - deploy a mock USDT or use existing one
    usdtAddress = "0x0000000000000000000000000000000000000000"; // Will deploy mock
  } else {
    // Local/other networks - deploy mock USDT
    usdtAddress = "0x0000000000000000000000000000000000000000"; // Will deploy mock
  }

  // Deploy Mock USDT if needed
  if (usdtAddress === "0x0000000000000000000000000000000000000000") {
    console.log("Deploying Mock USDT...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    usdtAddress = await mockUSDT.getAddress();
    console.log("Mock USDT deployed to:", usdtAddress);
  }

  // Deploy NFT Marketplace
  console.log("Deploying NFT Marketplace...");
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const nftMarketplace = await NFTMarketplace.deploy(
    "EthCentral NFT", // name
    "ETNFT",          // symbol
    usdtAddress       // USDT token address
  );

  await nftMarketplace.waitForDeployment();
  const marketplaceAddress = await nftMarketplace.getAddress();

  console.log("NFT Marketplace deployed to:", marketplaceAddress);
  console.log("USDT Token address:", usdtAddress);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    marketplace: marketplaceAddress,
    usdt: usdtAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber()
  };

  console.log("\nDeployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verify contracts on Etherscan (if not local network)
  if (network.chainId !== 31337n) {
    console.log("\nWaiting for block confirmations...");
    await nftMarketplace.deploymentTransaction().wait(6);
    
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: marketplaceAddress,
        constructorArguments: ["EthCentral NFT", "ETNFT", usdtAddress],
      });
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });