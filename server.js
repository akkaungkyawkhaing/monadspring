// server.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
// Import the entire ethers library object
const ethers = require('ethers');

// Add a log to check ethers version at the very top
console.log('Ethers library version:', ethers.version);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({})); // Allow frontend to make requests from a different origin
app.use(express.json()); // To parse JSON request bodies

// Monad Testnet Configuration
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz';
const FAUCET_PRIVATE_KEY = process.env.FAUCET_PRIVATE_KEY; // !!! Store this securely, preferably in .env

// Faucet Rules Configuration
const TOKEN_TO_DISTRIBUTE_PER_REQUEST = ethers.parseEther("0.01"); // Each request gives 0.01 MON
const DAILY_MON_LIMIT_PER_ADDRESS = ethers.parseEther("0.01");     // Max 0.01 MON per address per day
const COOLDOWN_SECONDS = 24 * 60 * 60; // 24 hours (in seconds) cooldown for each address

// Ensure private key is set for faucet
if (!FAUCET_PRIVATE_KEY) {
    console.error("FAUCET_PRIVATE_KEY is not set in .env file. Faucet will not work.");
    process.exit(1);
}

// Initialize ethers provider and wallet
const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);
const wallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);

// Add initial debugging for wallet object right after initialization
console.log('--- Initial Wallet Debugging ---');
console.log('Wallet object:', wallet);
console.log('Type of wallet:', typeof wallet);
console.log('Does wallet have getBalance method?', typeof wallet.getBalance);
console.log('Wallet instance of ethers.Wallet?', wallet instanceof ethers.Wallet);
console.log('Does ethers.Wallet.prototype have getBalance method?', typeof ethers.Wallet.prototype.getBalance);
console.log('--- End Initial Wallet Debugging ---');

// Basic root route for testing - NEW
app.get('/', (req, res) => {
    res.send('Monad Spring Backend is running! Access API at /api/faucet, /api/explorer, etc.');
});

// Store request data per address (This is an in-memory map and will reset if the server restarts)
const addressData = new Map();

// Minimal ERC-721 ABI for balanceOf function
const ERC721_ABI = [
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

// --- API Endpoints ---

// NEW: NFT Ownership Check Endpoint
app.post('/api/check-nft-ownership', async (req, res) => {
    const { walletAddress, nftContractAddress } = req.body;

    if (!ethers.isAddress(walletAddress) || !ethers.isAddress(nftContractAddress)) {
        return res.status(400).json({ success: false, message: 'Invalid wallet or NFT contract address.' });
    }

    try {
        // Create a contract instance for the NFT
        const nftContract = new ethers.Contract(nftContractAddress, ERC721_ABI, provider);
        
        // Call balanceOf to check how many NFTs the wallet owns
        const balance = await nftContract.balanceOf(walletAddress);
        const hasNFT = balance > 0; // If balance is greater than 0, the wallet owns at least one NFT

        res.json({ success: true, hasNFT: hasNFT, message: hasNFT ? 'NFT found.' : 'NFT not found.' });

    } catch (error) {
        console.error('NFT ownership check error:', error);
        res.status(500).json({ success: false, message: `Failed to check NFT ownership: ${error.message}` });
    }
});


// 1. Faucet Endpoint
app.post('/api/faucet', async (req, res) => {
    const { address } = req.body; // This is the recipient address for tokens

    // 1. Validate Address
    if (!ethers.isAddress(address)) {
        return res.status(400).json({ success: false, message: 'Invalid Monad address.' });
    }

    // --- IMPORTANT: Internal NFT Check (Backend-side validation) ---
    // This check is crucial to ensure that even if frontend validation is bypassed,
    // the backend still enforces the NFT ownership rule.
    const REQUIRED_NFT_CONTRACT_ADDRESS_BACKEND = "0xFc983B762D564dD6388983BB45D2E59C46805DB2"; // <<< MUST BE THE SAME AS FRONTEND
    try {
        const nftContract = new ethers.Contract(REQUIRED_NFT_CONTRACT_ADDRESS_BACKEND, ERC721_ABI, provider);
        const nftBalance = await nftContract.balanceOf(address); // Check NFT balance of the recipient address
        if (nftBalance === 0) {
            return res.status(403).json({ success: false, message: 'NFT not found in your wallet. Please mint one to proceed.' });
        }
    } catch (error) {
        console.error('Backend NFT check error:', error);
        return res.status(500).json({ success: false, message: `Internal server error during NFT check: ${error.message}` });
    }
    // --- End Internal NFT Check ---


    const now = Date.now(); // Current timestamp in milliseconds

    // Retrieve or initialize data for the requesting address
    let dataForAddress = addressData.get(address) || {
        lastRequestTime: 0,
        dailyTotalSent: ethers.parseEther("0"), // Initialize with 0 MON (as BigInt)
        dailyResetTimestamp: now // Initialize to 'now' so first request triggers a reset calculation
    };

    // 2. Cooldown Check
    if (dataForAddress.lastRequestTime && (now - dataForAddress.lastRequestTime) < COOLDOWN_SECONDS * 1000) {
        const remainingMillis = (COOLDOWN_SECONDS * 1000) - (now - dataForAddress.lastRequestTime);
        const hours = Math.floor(remainingMillis / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMillis % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remainingMillis % (1000 * 60)) / 1000);
        const remainingTimeStr = `${hours}h ${minutes}m ${seconds}s`;
        return res.status(429).json({
            success: false,
            message: `Please wait ${remainingTimeStr} before requesting again.`,
            remainingTime: remainingMillis // Send raw millis to frontend for accurate countdown
        });
    }

    // 3. Daily Limit Check
    if (dataForAddress.dailyResetTimestamp <= now) {
        dataForAddress.dailyTotalSent = ethers.parseEther("0"); // Reset daily count
        dataForAddress.dailyResetTimestamp = now + (COOLDOWN_SECONDS * 1000);
    }

    if (dataForAddress.dailyTotalSent + TOKEN_TO_DISTRIBUTE_PER_REQUEST > DAILY_MON_LIMIT_PER_ADDRESS) {
        return res.status(429).json({
            success: false,
            message: `You have reached your daily limit of ${ethers.formatEther(DAILY_MON_LIMIT_PER_ADDRESS)} MON. Please wait for the daily limit to reset.`
        });
    }

    // --- Send Transaction ---
    try {
        const tx = {
            to: address,
            value: TOKEN_TO_DISTRIBUTE_PER_REQUEST,
            gasLimit: 21000 // Standard gas limit for simple MON transfer
        };

        let gasPrice;
        // Prioritize getFeeData for modern chains, fallback to getGasPrice if needed
        if (typeof provider.getFeeData === 'function') {
            console.log('Using provider.getFeeData() for gas price estimation.');
            const feeData = await provider.getFeeData();
            // console.log('Fee Data:', feeData); // Uncomment for detailed feeData inspection

            if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                tx.maxFeePerGas = feeData.maxFeePerGas;
                tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
                // Remove gasPrice if EIP-1559 fees are used
                delete tx.gasPrice;
            } else if (feeData.gasPrice) {
                gasPrice = feeData.gasPrice;
            } else {
                console.warn("Could not determine gas price from getFeeData. Using default.");
                gasPrice = ethers.parseUnits("1", "gwei"); // Default to 1 Gwei if all else fails
            }
        } else if (typeof provider.getGasPrice === 'function') {
            console.log('Using provider.getGasPrice() for gas price estimation.');
            gasPrice = await provider.getGasPrice();
        } else {
            console.warn("Neither getGasPrice nor getFeeData is available on provider. Using default gas price.");
            gasPrice = ethers.parseUnits("1", "gwei"); // Default to 1 Gwei if no method is found
        }

        // Only set tx.gasPrice if it's not already set by EIP-1559 fees (maxFeePerGas/maxPriorityFeePerGas)
        if (!tx.maxFeePerGas && gasPrice) {
            tx.gasPrice = gasPrice;
        } else if (!tx.maxFeePerGas && !gasPrice) {
             // If no gas price could be determined, and no EIP-1559 fees, throw an error to prevent stuck transactions
            throw new Error("Failed to determine transaction gas price.");
        }

        const transaction = await wallet.sendTransaction(tx);

        dataForAddress.lastRequestTime = now;
        dataForAddress.dailyTotalSent = dataForAddress.dailyTotalSent + TOKEN_TO_DISTRIBUTE_PER_REQUEST;
        addressData.set(address, dataForAddress);

        res.json({ success: true, message: 'Test MON sent successfully!', txHash: transaction.hash });

    } catch (error) {
        console.error('Faucet error:', error);
        if (error.code === 'INSUFFICIENT_FUNDS') {
            res.status(500).json({ success: false, message: 'Faucet has insufficient funds to complete this request.', error: error.message });
        } else {
            res.status(500).json({ success: false, message: `Failed to send test MON: ${error.message}`, error: error.message });
        }
    }
});

// 2. Explorer Endpoint (Get Transaction Details)
app.get('/api/explorer/transaction/:txHash', async (req, res) => {
    const { txHash } = req.params;

    try {
        const transaction = await provider.getTransaction(txHash);
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }
        const receipt = await provider.getTransactionReceipt(txHash);

        res.json({ success: true, transaction, receipt });
    } catch (error) {
        console.error('Explorer Tx error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve transaction details.', error: error.message });
    }
});

// 3. Explorer Endpoint (Get Address Details - Balance & Recent Txns)
app.get('/api/explorer/address/:address', async (req, res) => {
    const { address } = req.params;

    if (!ethers.isAddress(address)) {
        return res.status(400).json({ success: false, message: 'Invalid Monad address.' });
    }

    try {
        const balance = await provider.getBalance(address);
        res.json({ success: true, address, balance: ethers.formatEther(balance) });
    } catch (error) {
        console.error('Explorer Address error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve address details.', error: error.message });
    }
});

// 4. Network Status Endpoint (Includes Faucet Balance)
app.get('/api/network-status', async (req, res) => {
    try {
        const blockNumber = await provider.getBlockNumber();
        
        let gasPriceDisplay;
        let gasPriceValue; // Store the actual BigInt value for potential use

        // Try getFeeData first for network status display
        if (typeof provider.getFeeData === 'function') {
            console.log('Network Status: Using provider.getFeeData()');
            const feeData = await provider.getFeeData();
            // console.log('Fee Data (Network Status):', feeData); // Uncomment for detailed feeData inspection

            if (feeData.gasPrice) {
                gasPriceValue = feeData.gasPrice;
                gasPriceDisplay = ethers.formatUnits(gasPriceValue, 'gwei') + ' Gwei';
            } else if (feeData.maxFeePerGas) {
                gasPriceValue = feeData.maxFeePerGas; // Use maxFeePerGas for display if gasPrice isn't available
                gasPriceDisplay = ethers.formatUnits(gasPriceValue, 'gwei') + ' Gwei (Max Fee)';
            } else {
                console.warn("Network Status: Could not determine gas price from getFeeData. Displaying N/A.");
                gasPriceDisplay = 'N/A';
            }
        } else if (typeof provider.getGasPrice === 'function') {
            console.log('Network Status: Using provider.getGasPrice()');
            gasPriceValue = await provider.getGasPrice();
            gasPriceDisplay = ethers.formatUnits(gasPriceValue, 'gwei') + ' Gwei';
        } else {
            console.warn("Network Status: Neither getGasPrice nor getFeeData is available. Displaying N/A.");
            gasPriceDisplay = 'N/A';
        }

        const network = await provider.getNetwork();

        const faucetBalance = await wallet.getBalance(); // Get the faucet wallet's balance

        res.json({
            success: true,
            blockNumber,
            gasPrice: gasPriceDisplay,
            networkName: network.name,
            chainId: network.chainId,
            faucetBalance: ethers.formatEther(faucetBalance) + ' MON'
        });
    } catch (error) {
        console.error('Network status error:', error);
        res.status(500).json({ success: false, message: `Failed to retrieve network status: ${error.message}`, error: error.message });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Monad RPC URL: ${MONAD_RPC_URL}`);
    console.log(`Faucet will distribute ${ethers.formatEther(TOKEN_TO_DISTRIBUTE_PER_REQUEST)} MON per request.`);
    console.log(`Daily limit per address: ${ethers.formatEther(DAILY_MON_LIMIT_PER_ADDRESS)} MON.`);
    console.log(`Cooldown: ${COOLDOWN_SECONDS / 3600} hours.`);
});
