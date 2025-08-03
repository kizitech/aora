// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title NFTMarketplace
 * @dev A comprehensive NFT marketplace contract with minting, trading, and payment features
 */
contract NFTMarketplace is ERC721, ERC721URIStorage, ERC721Royalty, Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    
    // Marketplace fee (in basis points, e.g., 250 = 2.5%)
    uint256 public marketplaceFee = 250;
    uint256 public constant MAX_MARKETPLACE_FEE = 1000; // Maximum 10%
    
    // USDT token address (can be updated by owner)
    address public usdtToken;
    
    struct Listing {
        uint256 tokenId;
        address seller;
        uint256 price;
        address paymentToken; // address(0) for ETH, token address for ERC20
        bool active;
        uint256 createdAt;
    }
    
    struct Auction {
        uint256 tokenId;
        address seller;
        uint256 startingPrice;
        uint256 currentBid;
        address currentBidder;
        address paymentToken;
        uint256 endTime;
        bool active;
        uint256 createdAt;
    }
    
    // Mappings
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;
    mapping(address => uint256) public pendingWithdrawals;
    mapping(uint256 => bool) public approvedNFTs; // For admin approval system
    
    // Events
    event NFTMinted(uint256 indexed tokenId, address indexed creator, string tokenURI);
    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price, address paymentToken);
    event NFTSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, address paymentToken);
    event ListingCancelled(uint256 indexed tokenId, address indexed seller);
    event AuctionCreated(uint256 indexed tokenId, address indexed seller, uint256 startingPrice, uint256 endTime, address paymentToken);
    event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 amount);
    event MarketplaceFeeUpdated(uint256 newFee);
    event USDTTokenUpdated(address newToken);
    event NFTApproved(uint256 indexed tokenId, bool approved);
    event RoyaltySet(uint256 indexed tokenId, address recipient, uint96 feeNumerator);

    constructor(
        string memory name,
        string memory symbol,
        address _usdtToken
    ) ERC721(name, symbol) Ownable(msg.sender) {
        usdtToken = _usdtToken;
    }

    // Modifiers
    modifier onlyTokenOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        _;
    }

    modifier onlyApprovedNFT(uint256 tokenId) {
        require(approvedNFTs[tokenId], "NFT not approved for marketplace");
        _;
    }

    // NFT Minting Functions
    function mintNFT(
        address to,
        string memory tokenURI,
        address royaltyRecipient,
        uint96 royaltyFeeNumerator
    ) public returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        if (royaltyRecipient != address(0) && royaltyFeeNumerator > 0) {
            _setTokenRoyalty(tokenId, royaltyRecipient, royaltyFeeNumerator);
            emit RoyaltySet(tokenId, royaltyRecipient, royaltyFeeNumerator);
        }
        
        emit NFTMinted(tokenId, to, tokenURI);
        return tokenId;
    }

    // Admin approval functions
    function approveNFT(uint256 tokenId, bool approved) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        approvedNFTs[tokenId] = approved;
        emit NFTApproved(tokenId, approved);
    }

    function batchApproveNFTs(uint256[] calldata tokenIds, bool approved) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_ownerOf(tokenIds[i]) != address(0), "Token does not exist");
            approvedNFTs[tokenIds[i]] = approved;
            emit NFTApproved(tokenIds[i], approved);
        }
    }

    // Marketplace Functions - Fixed Price Listings
    function listNFT(
        uint256 tokenId,
        uint256 price,
        address paymentToken
    ) external onlyTokenOwner(tokenId) onlyApprovedNFT(tokenId) whenNotPaused {
        require(price > 0, "Price must be greater than 0");
        require(
            paymentToken == address(0) || paymentToken == usdtToken,
            "Invalid payment token"
        );
        require(!listings[tokenId].active, "Already listed");
        require(!auctions[tokenId].active, "Token in auction");

        listings[tokenId] = Listing({
            tokenId: tokenId,
            seller: msg.sender,
            price: price,
            paymentToken: paymentToken,
            active: true,
            createdAt: block.timestamp
        });

        emit NFTListed(tokenId, msg.sender, price, paymentToken);
    }

    function buyNFT(uint256 tokenId) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed for sale");
        require(listing.seller != msg.sender, "Cannot buy your own NFT");

        uint256 totalPrice = listing.price;
        address seller = listing.seller;
        address paymentToken = listing.paymentToken;

        // Calculate fees
        uint256 marketplaceFeeAmount = (totalPrice * marketplaceFee) / 10000;
        uint256 royaltyAmount = 0;
        address royaltyRecipient = address(0);

        // Check for royalties
        (royaltyRecipient, royaltyAmount) = royaltyInfo(tokenId, totalPrice);
        
        uint256 sellerAmount = totalPrice - marketplaceFeeAmount - royaltyAmount;

        // Handle payment
        if (paymentToken == address(0)) {
            // ETH payment
            require(msg.value >= totalPrice, "Insufficient ETH");
            
            // Transfer payments
            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                payable(royaltyRecipient).transfer(royaltyAmount);
            }
            payable(seller).transfer(sellerAmount);
            payable(owner()).transfer(marketplaceFeeAmount);
            
            // Refund excess
            if (msg.value > totalPrice) {
                payable(msg.sender).transfer(msg.value - totalPrice);
            }
        } else {
            // ERC20 payment (USDT)
            require(msg.value == 0, "ETH not accepted for ERC20 payment");
            IERC20 token = IERC20(paymentToken);
            
            require(
                token.transferFrom(msg.sender, address(this), totalPrice),
                "Payment transfer failed"
            );
            
            // Transfer payments
            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                require(token.transfer(royaltyRecipient, royaltyAmount), "Royalty transfer failed");
            }
            require(token.transfer(seller, sellerAmount), "Seller transfer failed");
            require(token.transfer(owner(), marketplaceFeeAmount), "Fee transfer failed");
        }

        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);

        // Clear listing
        delete listings[tokenId];

        emit NFTSold(tokenId, seller, msg.sender, totalPrice, paymentToken);
    }

    function cancelListing(uint256 tokenId) external onlyTokenOwner(tokenId) {
        require(listings[tokenId].active, "Not listed");
        
        delete listings[tokenId];
        emit ListingCancelled(tokenId, msg.sender);
    }

    // Auction Functions
    function createAuction(
        uint256 tokenId,
        uint256 startingPrice,
        uint256 duration,
        address paymentToken
    ) external onlyTokenOwner(tokenId) onlyApprovedNFT(tokenId) whenNotPaused {
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration >= 1 hours && duration <= 7 days, "Invalid duration");
        require(
            paymentToken == address(0) || paymentToken == usdtToken,
            "Invalid payment token"
        );
        require(!listings[tokenId].active, "Token is listed");
        require(!auctions[tokenId].active, "Auction already exists");

        auctions[tokenId] = Auction({
            tokenId: tokenId,
            seller: msg.sender,
            startingPrice: startingPrice,
            currentBid: 0,
            currentBidder: address(0),
            paymentToken: paymentToken,
            endTime: block.timestamp + duration,
            active: true,
            createdAt: block.timestamp
        });

        emit AuctionCreated(tokenId, msg.sender, startingPrice, block.timestamp + duration, paymentToken);
    }

    function placeBid(uint256 tokenId) external payable nonReentrant whenNotPaused {
        Auction storage auction = auctions[tokenId];
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Cannot bid on your own auction");

        uint256 bidAmount;
        
        if (auction.paymentToken == address(0)) {
            // ETH bid
            bidAmount = msg.value;
            require(bidAmount >= auction.startingPrice, "Bid below starting price");
            require(bidAmount > auction.currentBid, "Bid too low");
        } else {
            // ERC20 bid
            require(msg.value == 0, "ETH not accepted for ERC20 auction");
            // For ERC20 auctions, we need to handle the bid amount differently
            // This is a simplified version - in production, you'd want a more sophisticated bidding system
            revert("ERC20 auctions not implemented in this version");
        }

        // Refund previous bidder
        if (auction.currentBidder != address(0)) {
            pendingWithdrawals[auction.currentBidder] += auction.currentBid;
        }

        auction.currentBid = bidAmount;
        auction.currentBidder = msg.sender;

        emit BidPlaced(tokenId, msg.sender, bidAmount);
    }

    function endAuction(uint256 tokenId) external nonReentrant {
        Auction storage auction = auctions[tokenId];
        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction not ended");

        auction.active = false;

        if (auction.currentBidder != address(0)) {
            // There was a winning bid
            uint256 totalPrice = auction.currentBid;
            address seller = auction.seller;
            address winner = auction.currentBidder;

            // Calculate fees
            uint256 marketplaceFeeAmount = (totalPrice * marketplaceFee) / 10000;
            uint256 royaltyAmount = 0;
            address royaltyRecipient = address(0);

            // Check for royalties
            (royaltyRecipient, royaltyAmount) = royaltyInfo(tokenId, totalPrice);
            
            uint256 sellerAmount = totalPrice - marketplaceFeeAmount - royaltyAmount;

            // Transfer payments
            if (royaltyAmount > 0 && royaltyRecipient != address(0)) {
                payable(royaltyRecipient).transfer(royaltyAmount);
            }
            payable(seller).transfer(sellerAmount);
            payable(owner()).transfer(marketplaceFeeAmount);

            // Transfer NFT
            _transfer(seller, winner, tokenId);

            emit AuctionEnded(tokenId, winner, totalPrice);
            emit NFTSold(tokenId, seller, winner, totalPrice, auction.paymentToken);
        } else {
            // No bids - return NFT to seller
            emit AuctionEnded(tokenId, address(0), 0);
        }

        delete auctions[tokenId];
    }

    // Withdrawal function for failed bidders
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    // Admin Functions
    function setMarketplaceFee(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_MARKETPLACE_FEE, "Fee too high");
        marketplaceFee = _fee;
        emit MarketplaceFeeUpdated(_fee);
    }

    function setUSDTToken(address _usdtToken) external onlyOwner {
        usdtToken = _usdtToken;
        emit USDTTokenUpdated(_usdtToken);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Emergency withdrawal (only owner)
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function emergencyWithdrawToken(address token) external onlyOwner {
        IERC20(token).transfer(owner(), IERC20(token).balanceOf(address(this)));
    }

    // View Functions
    function getCurrentTokenId() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    function isTokenApproved(uint256 tokenId) external view returns (bool) {
        return approvedNFTs[tokenId];
    }

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }

    function getAuction(uint256 tokenId) external view returns (Auction memory) {
        return auctions[tokenId];
    }

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721) {
        super._increaseBalance(account, value);
    }
}