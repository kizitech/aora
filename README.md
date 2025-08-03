# NFT Marketplace - Eth-Central Clone

A full-stack NFT marketplace replicating the structure and design of Eth-Central.com with custom workflows for mnemonic wallet integration, admin approval system, and shopping cart functionality.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                      │
├─────────────────────────────────────────────────────────────────┤
│  Public Pages    │  User Dashboard   │  Admin Dashboard        │
│  - Browse        │  - Upload Status  │  - Upload Approvals     │
│  - Marketplace   │  - Purchase Hist  │  - Sales/Orders View    │
│  - Create/List   │  - Shopping Cart  │  - Content Management   │
│  - Help/About    │  - Profile        │  - User Management      │
│  - Contact       │                   │                         │
│  - Auth          │                   │                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ REST API / WebSocket
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Node.js/Express)                 │
├─────────────────────────────────────────────────────────────────┤
│  Authentication  │  NFT Management   │  Payment Processing     │
│  - JWT Auth      │  - Upload Queue   │  - ETH Transactions     │
│  - Wallet Mgmt   │  - Admin Review   │  - USDT Support         │
│  - Encryption    │  - Metadata Store │  - Transaction Verify   │
│                  │                   │                         │
│  Admin APIs      │  User APIs        │  Marketplace APIs       │
│  - Approvals     │  - Profile        │  - Browse/Search        │
│  - Analytics     │  - Upload         │  - Cart Management      │
│  - Content Mgmt  │  - Purchase Hist  │  - Order Processing     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────┐
│    Database         │    │   File Storage      │    │  Blockchain │
│    (PostgreSQL)     │    │   (IPFS/S3)        │    │  (Ethereum) │
├─────────────────────┤    ├─────────────────────┤    ├─────────────┤
│ - Users             │    │ - NFT Images        │    │ - NFT Token │
│ - NFTs              │    │ - Metadata          │    │ - Marketplace│
│ - Orders            │    │ - Thumbnails        │    │ - Payments  │
│ - Reviews           │    │                     │    │             │
│ - Transactions      │    │                     │    │             │
│ - Admin Logs        │    │                     │    │             │
└─────────────────────┘    └─────────────────────┘    └─────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State Management**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS + Styled Components
- **Web3**: ethers.js v6, wagmi, viem
- **UI Components**: Headless UI, React Hook Form
- **File Upload**: react-dropzone
- **Charts**: recharts (for admin analytics)

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + Passport.js
- **File Storage**: IPFS (Pinata) + AWS S3 backup
- **Encryption**: crypto-js (AES-256-GCM)
- **Rate Limiting**: express-rate-limit
- **Validation**: zod
- **Email**: nodemailer
- **Logging**: winston

### Blockchain
- **Network**: Ethereum (Mainnet/Sepolia testnet)
- **Smart Contracts**: Solidity ^0.8.20
- **Framework**: Hardhat
- **Standards**: ERC-721 (NFTs), ERC-20 (USDT)
- **Libraries**: OpenZeppelin

### DevOps & Security
- **Containerization**: Docker
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt
- **Monitoring**: Prometheus + Grafana
- **Security**: Helmet.js, CORS, CSP headers

## 📋 Core Features

### User Features
- ✅ Register with email + connect wallet via mnemonic
- ✅ Browse NFT marketplace with filtering/sorting
- ✅ Upload NFTs (pending admin approval)
- ✅ Shopping cart + checkout flow
- ✅ Payment in ETH or USDT
- ✅ User dashboard (uploads, purchases, cart)
- ✅ Profile management

### Admin Features
- ✅ Admin dashboard with analytics
- ✅ NFT upload approval/rejection
- ✅ Sales and order management
- ✅ Content page management
- ✅ User management and moderation

### Security Features
- ✅ Encrypted mnemonic storage (AES-256-GCM)
- ✅ JWT authentication with refresh tokens
- ✅ Rate limiting and DDoS protection
- ✅ Input validation and sanitization
- ✅ CSRF protection
- ✅ Secure file upload validation

## 🔗 Smart Contract Architecture

### NFTMarketplace.sol
```solidity
├── ERC721 Token Contract
│   ├── Minting functions
│   ├── Metadata management
│   └── Royalty support (EIP-2981)
├── Marketplace Logic
│   ├── Listing management
│   ├── Fixed price sales
│   ├── Auction functionality
│   └── Fee management
└── Payment Processing
    ├── ETH payments
    ├── ERC-20 token support (USDT)
    └── Escrow functionality
```

## 📊 Database Schema

```sql
-- Users table
Users {
  id: UUID (PK)
  email: VARCHAR(255) UNIQUE
  username: VARCHAR(50) UNIQUE
  encrypted_mnemonic: TEXT
  wallet_address: VARCHAR(42)
  role: ENUM('user', 'admin')
  avatar_url: VARCHAR(500)
  bio: TEXT
  is_verified: BOOLEAN
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- NFTs table
NFTs {
  id: UUID (PK)
  creator_id: UUID (FK -> Users.id)
  token_id: BIGINT
  contract_address: VARCHAR(42)
  title: VARCHAR(255)
  description: TEXT
  image_url: VARCHAR(500)
  metadata_url: VARCHAR(500)
  price: DECIMAL(20,8)
  currency: ENUM('ETH', 'USDT')
  status: ENUM('pending', 'approved', 'rejected', 'sold')
  approval_notes: TEXT
  approved_by: UUID (FK -> Users.id)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- Orders table
Orders {
  id: UUID (PK)
  buyer_id: UUID (FK -> Users.id)
  seller_id: UUID (FK -> Users.id)
  nft_id: UUID (FK -> NFTs.id)
  price: DECIMAL(20,8)
  currency: ENUM('ETH', 'USDT')
  status: ENUM('pending', 'completed', 'failed', 'cancelled')
  transaction_hash: VARCHAR(66)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- Cart table
Cart {
  id: UUID (PK)
  user_id: UUID (FK -> Users.id)
  nft_id: UUID (FK -> NFTs.id)
  added_at: TIMESTAMP
}
```

## 🚀 User Workflows

### 1. User Registration & Wallet Connection
```
1. User registers with email/password
2. User enters 12/24-word mnemonic phrase
3. System derives wallet address and encrypts mnemonic
4. Wallet connection verified on blockchain
5. User account activated
```

### 2. NFT Upload & Approval
```
1. User uploads NFT file + metadata
2. System stores file on IPFS + backup to S3
3. NFT status set to 'pending'
4. Admin reviews upload in dashboard
5. Admin approves/rejects with notes
6. If approved: NFT minted and becomes public
7. User notified of decision
```

### 3. Shopping & Checkout
```
1. User browses marketplace
2. User adds NFTs to cart
3. User proceeds to checkout
4. User selects payment method (ETH/USDT)
5. Smart contract processes payment
6. Transaction verified on blockchain
7. NFT ownership transferred to buyer
8. Order marked complete
```

### 4. Admin Workflow
```
1. Admin logs into dashboard
2. Reviews pending NFT uploads
3. Approves/rejects uploads with feedback
4. Monitors sales analytics
5. Manages user accounts and content
6. Handles dispute resolution
```

## 🔒 Security Considerations

### Mnemonic Storage
- **Encryption**: AES-256-GCM with user-specific keys
- **Key Derivation**: PBKDF2 with high iteration count
- **Storage**: Never store plain text mnemonics
- **Access**: Decrypt only when needed for transactions
- **Alternative**: Encourage MetaMask/WalletConnect usage

### Transaction Security
- **Verification**: Always verify blockchain transactions
- **Escrow**: Use smart contract escrow for payments
- **Slippage**: Protection against front-running
- **Gas**: Dynamic gas estimation and limits

### API Security
- **Authentication**: JWT with short expiry + refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: Per-user and per-IP limits
- **Input Validation**: Comprehensive input sanitization
- **HTTPS**: TLS 1.3 encryption for all communications

## 📁 Project Structure

```
nft-marketplace/
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── store/            # Redux store
│   │   ├── services/         # API services
│   │   ├── utils/            # Utility functions
│   │   └── types/            # TypeScript type definitions
│   ├── public/               # Static assets
│   └── package.json
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Express middleware
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Utility functions
│   │   └── config/           # Configuration files
│   ├── prisma/               # Database schema & migrations
│   └── package.json
├── contracts/                  # Smart contracts
│   ├── contracts/            # Solidity contracts
│   ├── scripts/              # Deployment scripts
│   ├── test/                 # Contract tests
│   └── hardhat.config.js
├── docker-compose.yml          # Development environment
├── nginx.conf                  # Reverse proxy config
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker & Docker Compose
- MetaMask or similar wallet

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd nft-marketplace
```

2. **Install dependencies**
```bash
# Install all dependencies
npm run install:all

# Or install individually
cd frontend && npm install
cd ../backend && npm install
cd ../contracts && npm install
```

3. **Environment Setup**
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp contracts/.env.example contracts/.env

# Configure your environment variables
```

4. **Database Setup**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

5. **Deploy Smart Contracts**
```bash
cd contracts
npx hardhat compile
npx hardhat deploy --network sepolia
```

6. **Start Development Environment**
```bash
# Start all services with Docker
docker-compose up -d

# Or start individually
npm run dev:backend
npm run dev:frontend
```

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/nft_marketplace"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-secret"
ENCRYPTION_KEY="your-32-char-encryption-key"
PINATA_API_KEY="your-pinata-api-key"
PINATA_SECRET="your-pinata-secret"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_S3_BUCKET="your-s3-bucket"
EMAIL_HOST="smtp.gmail.com"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
```

**Frontend (.env)**
```env
REACT_APP_API_URL="http://localhost:3001"
REACT_APP_WALLET_CONNECT_PROJECT_ID="your-project-id"
REACT_APP_NETWORK_CHAIN_ID="11155111"
```

**Contracts (.env)**
```env
PRIVATE_KEY="your-deployer-private-key"
SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/your-project-id"
ETHERSCAN_API_KEY="your-etherscan-api-key"
```

## 📖 API Documentation

The API documentation is available at `/api/docs` when running the backend server.

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run specific test suites
npm run test:backend
npm run test:frontend
npm run test:contracts
```

## 🚀 Deployment

```bash
# Build for production
npm run build

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## ⚠️ Security Notice

This marketplace includes mnemonic phrase storage functionality for wallet recovery. While this is encrypted using industry-standard methods, storing seed phrases online carries inherent security risks. We strongly recommend:

1. Using MetaMask or WalletConnect for wallet connections when possible
2. Regular security audits of the encryption implementation
3. Implementing additional security measures like 2FA
4. Educating users about the risks of online seed phrase storage

For production deployments, consider removing mnemonic storage entirely and using only MetaMask/WalletConnect integration.