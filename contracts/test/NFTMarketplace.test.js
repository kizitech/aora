const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTMarketplace", function () {
  let nftMarketplace;
  let mockUSDT;
  let owner;
  let creator;
  let buyer;
  let bidder1;
  let bidder2;
  let addrs;

  const tokenURI = "https://ipfs.io/ipfs/QmTestHash";
  const price = ethers.parseEther("1"); // 1 ETH
  const usdtPrice = 1000n * 10n**6n; // 1000 USDT (6 decimals)

  beforeEach(async function () {
    [owner, creator, buyer, bidder1, bidder2, ...addrs] = await ethers.getSigners();

    // Deploy Mock USDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();

    // Deploy NFT Marketplace
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    nftMarketplace = await NFTMarketplace.deploy(
      "Test NFT",
      "TNFT",
      await mockUSDT.getAddress()
    );
    await nftMarketplace.waitForDeployment();

    // Give some USDT to test accounts
    await mockUSDT.mint(buyer.address, usdtPrice * 10n);
    await mockUSDT.mint(bidder1.address, usdtPrice * 5n);
    await mockUSDT.mint(bidder2.address, usdtPrice * 5n);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await nftMarketplace.owner()).to.equal(owner.address);
    });

    it("Should set the correct USDT token", async function () {
      expect(await nftMarketplace.usdtToken()).to.equal(await mockUSDT.getAddress());
    });

    it("Should set the correct marketplace fee", async function () {
      expect(await nftMarketplace.marketplaceFee()).to.equal(250); // 2.5%
    });
  });

  describe("NFT Minting", function () {
    it("Should mint NFT with correct details", async function () {
      await nftMarketplace.connect(creator).mintNFT(
        creator.address,
        tokenURI,
        creator.address,
        500 // 5% royalty
      );

      expect(await nftMarketplace.ownerOf(0)).to.equal(creator.address);
      expect(await nftMarketplace.tokenURI(0)).to.equal(tokenURI);
      
      const royaltyInfo = await nftMarketplace.royaltyInfo(0, ethers.parseEther("1"));
      expect(royaltyInfo[0]).to.equal(creator.address);
      expect(royaltyInfo[1]).to.equal(ethers.parseEther("0.05")); // 5% of 1 ETH
    });

    it("Should increment token counter", async function () {
      await nftMarketplace.connect(creator).mintNFT(creator.address, tokenURI, ethers.ZeroAddress, 0);
      expect(await nftMarketplace.getCurrentTokenId()).to.equal(1);
      
      await nftMarketplace.connect(creator).mintNFT(creator.address, tokenURI, ethers.ZeroAddress, 0);
      expect(await nftMarketplace.getCurrentTokenId()).to.equal(2);
    });
  });

  describe("Admin Approval", function () {
    beforeEach(async function () {
      await nftMarketplace.connect(creator).mintNFT(creator.address, tokenURI, ethers.ZeroAddress, 0);
    });

    it("Should allow owner to approve NFT", async function () {
      await nftMarketplace.connect(owner).approveNFT(0, true);
      expect(await nftMarketplace.isTokenApproved(0)).to.be.true;
    });

    it("Should emit NFTApproved event", async function () {
      await expect(nftMarketplace.connect(owner).approveNFT(0, true))
        .to.emit(nftMarketplace, "NFTApproved")
        .withArgs(0, true);
    });

    it("Should not allow non-owner to approve NFT", async function () {
      await expect(nftMarketplace.connect(creator).approveNFT(0, true))
        .to.be.revertedWithCustomError(nftMarketplace, "OwnableUnauthorizedAccount");
    });

    it("Should batch approve NFTs", async function () {
      await nftMarketplace.connect(creator).mintNFT(creator.address, tokenURI, ethers.ZeroAddress, 0);
      await nftMarketplace.connect(creator).mintNFT(creator.address, tokenURI, ethers.ZeroAddress, 0);
      
      await nftMarketplace.connect(owner).batchApproveNFTs([0, 1, 2], true);
      
      expect(await nftMarketplace.isTokenApproved(0)).to.be.true;
      expect(await nftMarketplace.isTokenApproved(1)).to.be.true;
      expect(await nftMarketplace.isTokenApproved(2)).to.be.true;
    });
  });

  describe("Fixed Price Listings", function () {
    beforeEach(async function () {
      await nftMarketplace.connect(creator).mintNFT(creator.address, tokenURI, ethers.ZeroAddress, 0);
      await nftMarketplace.connect(owner).approveNFT(0, true);
    });

    it("Should list NFT for sale", async function () {
      await nftMarketplace.connect(creator).listNFT(0, price, ethers.ZeroAddress);
      
      const listing = await nftMarketplace.getListing(0);
      expect(listing.active).to.be.true;
      expect(listing.seller).to.equal(creator.address);
      expect(listing.price).to.equal(price);
      expect(listing.paymentToken).to.equal(ethers.ZeroAddress);
    });

    it("Should not allow listing unapproved NFT", async function () {
      await nftMarketplace.connect(creator).mintNFT(creator.address, tokenURI, ethers.ZeroAddress, 0);
      
      await expect(nftMarketplace.connect(creator).listNFT(1, price, ethers.ZeroAddress))
        .to.be.revertedWith("NFT not approved for marketplace");
    });

    it("Should buy NFT with ETH", async function () {
      await nftMarketplace.connect(creator).listNFT(0, price, ethers.ZeroAddress);
      
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      await nftMarketplace.connect(buyer).buyNFT(0, { value: price });
      
      expect(await nftMarketplace.ownerOf(0)).to.equal(buyer.address);
      
      const listing = await nftMarketplace.getListing(0);
      expect(listing.active).to.be.false;
      
      // Check payments (creator gets 97.5%, marketplace gets 2.5%)
      const marketplaceFee = price * 250n / 10000n;
      const sellerAmount = price - marketplaceFee;
      
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(sellerAmount);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(marketplaceFee);
    });

    it("Should buy NFT with USDT", async function () {
      await nftMarketplace.connect(creator).listNFT(0, usdtPrice, await mockUSDT.getAddress());
      
      // Approve USDT spending
      await mockUSDT.connect(buyer).approve(await nftMarketplace.getAddress(), usdtPrice);
      
      const creatorBalanceBefore = await mockUSDT.balanceOf(creator.address);
      const ownerBalanceBefore = await mockUSDT.balanceOf(owner.address);
      
      await nftMarketplace.connect(buyer).buyNFT(0);
      
      expect(await nftMarketplace.ownerOf(0)).to.equal(buyer.address);
      
      // Check USDT payments
      const marketplaceFee = usdtPrice * 250n / 10000n;
      const sellerAmount = usdtPrice - marketplaceFee;
      
      const creatorBalanceAfter = await mockUSDT.balanceOf(creator.address);
      const ownerBalanceAfter = await mockUSDT.balanceOf(owner.address);
      
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(sellerAmount);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(marketplaceFee);
    });

    it("Should handle royalties correctly", async function () {
      // Mint NFT with 5% royalty
      await nftMarketplace.connect(creator).mintNFT(creator.address, tokenURI, creator.address, 500);
      await nftMarketplace.connect(owner).approveNFT(1, true);
      
      // Transfer to another user first
      await nftMarketplace.connect(creator).transferFrom(creator.address, addrs[0].address, 1);
      
      // List by new owner
      await nftMarketplace.connect(addrs[0]).listNFT(1, price, ethers.ZeroAddress);
      
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
      const sellerBalanceBefore = await ethers.provider.getBalance(addrs[0].address);
      
      await nftMarketplace.connect(buyer).buyNFT(1, { value: price });
      
      // Check royalty payment (5% to creator)
      const royaltyAmount = price * 500n / 10000n; // 5%
      const marketplaceFee = price * 250n / 10000n; // 2.5%
      const sellerAmount = price - royaltyAmount - marketplaceFee;
      
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      const sellerBalanceAfter = await ethers.provider.getBalance(addrs[0].address);
      
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(royaltyAmount);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(sellerAmount);
    });

    it("Should cancel listing", async function () {
      await nftMarketplace.connect(creator).listNFT(0, price, ethers.ZeroAddress);
      await nftMarketplace.connect(creator).cancelListing(0);
      
      const listing = await nftMarketplace.getListing(0);
      expect(listing.active).to.be.false;
    });
  });

  describe("Auctions", function () {
    beforeEach(async function () {
      await nftMarketplace.connect(creator).mintNFT(creator.address, tokenURI, ethers.ZeroAddress, 0);
      await nftMarketplace.connect(owner).approveNFT(0, true);
    });

    it("Should create auction", async function () {
      const duration = 86400; // 1 day
      const startingPrice = ethers.parseEther("0.5");
      
      await nftMarketplace.connect(creator).createAuction(0, startingPrice, duration, ethers.ZeroAddress);
      
      const auction = await nftMarketplace.getAuction(0);
      expect(auction.active).to.be.true;
      expect(auction.seller).to.equal(creator.address);
      expect(auction.startingPrice).to.equal(startingPrice);
    });

    it("Should place bid", async function () {
      const duration = 86400;
      const startingPrice = ethers.parseEther("0.5");
      const bidAmount = ethers.parseEther("1");
      
      await nftMarketplace.connect(creator).createAuction(0, startingPrice, duration, ethers.ZeroAddress);
      await nftMarketplace.connect(bidder1).placeBid(0, { value: bidAmount });
      
      const auction = await nftMarketplace.getAuction(0);
      expect(auction.currentBid).to.equal(bidAmount);
      expect(auction.currentBidder).to.equal(bidder1.address);
    });

    it("Should handle multiple bids and refunds", async function () {
      const duration = 86400;
      const startingPrice = ethers.parseEther("0.5");
      const bid1 = ethers.parseEther("1");
      const bid2 = ethers.parseEther("1.5");
      
      await nftMarketplace.connect(creator).createAuction(0, startingPrice, duration, ethers.ZeroAddress);
      
      // First bid
      await nftMarketplace.connect(bidder1).placeBid(0, { value: bid1 });
      
      // Second bid (higher)
      await nftMarketplace.connect(bidder2).placeBid(0, { value: bid2 });
      
      // Check pending withdrawal for first bidder
      expect(await nftMarketplace.pendingWithdrawals(bidder1.address)).to.equal(bid1);
      
      const auction = await nftMarketplace.getAuction(0);
      expect(auction.currentBid).to.equal(bid2);
      expect(auction.currentBidder).to.equal(bidder2.address);
    });

    it("Should end auction and transfer NFT", async function () {
      const duration = 86400;
      const startingPrice = ethers.parseEther("0.5");
      const bidAmount = ethers.parseEther("1");
      
      await nftMarketplace.connect(creator).createAuction(0, startingPrice, duration, ethers.ZeroAddress);
      await nftMarketplace.connect(bidder1).placeBid(0, { value: bidAmount });
      
      // Fast forward time
      await time.increase(duration + 1);
      
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
      
      await nftMarketplace.connect(bidder1).endAuction(0);
      
      expect(await nftMarketplace.ownerOf(0)).to.equal(bidder1.address);
      
      // Check payment to creator
      const marketplaceFee = bidAmount * 250n / 10000n;
      const sellerAmount = bidAmount - marketplaceFee;
      
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(sellerAmount);
    });

    it("Should allow withdrawal of failed bids", async function () {
      const duration = 86400;
      const startingPrice = ethers.parseEther("0.5");
      const bid1 = ethers.parseEther("1");
      const bid2 = ethers.parseEther("1.5");
      
      await nftMarketplace.connect(creator).createAuction(0, startingPrice, duration, ethers.ZeroAddress);
      await nftMarketplace.connect(bidder1).placeBid(0, { value: bid1 });
      await nftMarketplace.connect(bidder2).placeBid(0, { value: bid2 });
      
      const balanceBefore = await ethers.provider.getBalance(bidder1.address);
      
      await nftMarketplace.connect(bidder1).withdraw();
      
      const balanceAfter = await ethers.provider.getBalance(bidder1.address);
      expect(balanceAfter - balanceBefore).to.be.closeTo(bid1, ethers.parseEther("0.01")); // Account for gas
    });
  });

  describe("Admin Functions", function () {
    it("Should update marketplace fee", async function () {
      await nftMarketplace.connect(owner).setMarketplaceFee(500); // 5%
      expect(await nftMarketplace.marketplaceFee()).to.equal(500);
    });

    it("Should not allow fee above maximum", async function () {
      await expect(nftMarketplace.connect(owner).setMarketplaceFee(1500))
        .to.be.revertedWith("Fee too high");
    });

    it("Should pause and unpause contract", async function () {
      await nftMarketplace.connect(owner).pause();
      
      await nftMarketplace.connect(creator).mintNFT(creator.address, tokenURI, ethers.ZeroAddress, 0);
      await nftMarketplace.connect(owner).approveNFT(0, true);
      
      await expect(nftMarketplace.connect(creator).listNFT(0, price, ethers.ZeroAddress))
        .to.be.revertedWithCustomError(nftMarketplace, "EnforcedPause");
      
      await nftMarketplace.connect(owner).unpause();
      
      await nftMarketplace.connect(creator).listNFT(0, price, ethers.ZeroAddress);
      const listing = await nftMarketplace.getListing(0);
      expect(listing.active).to.be.true;
    });
  });
});