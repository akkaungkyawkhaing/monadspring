# Monad Spring

Monad Spring is a community-driven testnet faucet and explorer designed for the Monad blockchain. It provides an intuitive interface for developers and users to obtain testnet tokens (MTT) and explore transaction details on the Monad testnet. A unique feature of Monad Spring is its NFT-gated faucet, ensuring a more controlled and potentially fairer distribution of testnet tokens.

## Why Monad Spring?

The primary motivation behind Monad Spring is to facilitate easier access to testnet tokens for the Monad developer community. By implementing an NFT gate, we aim to:

* **Control Distribution:** Prevent bot abuse and ensure tokens are distributed to genuine users and developers.
* **Promote Engagement:** Encourage users to interact with the Monad ecosystem by requiring ownership of a specific NFT before claiming tokens.
* **Provide a Learning Tool:** Serve as an example of a full-stack dApp interacting with custom ERC-20 and ERC-721 contracts on the Monad testnet.

## Technologies Used

* **Frontend:**
    * **React.js:** For building the interactive user interface.
    * **Tailwind CSS:** For rapid and responsive UI styling, providing a sleek dark theme.
    * **Lucide React:** For modern and customizable icons (used for most icons except the main title and wallet icons which are image-based).
* **Backend:**
    * **Node.js:** The runtime environment for the server.
    * **Express.js:** A fast, unopinionated, minimalist web framework for Node.js, handling API requests.
    * **Ethers.js:** A complete and compact library for interacting with the Ethereum blockchain and its ecosystem, used for contract interactions and transaction handling.
* **Smart Contracts:**
    * **Solidity:** The programming language for writing the smart contracts.
    * **OpenZeppelin Contracts:** Standardized and secure smart contract implementations (ERC-20, ERC-721, Ownable).

## How It Works

Monad Spring operates with a client-server architecture, interacting with smart contracts on the Monad testnet:

1.  **Smart Contracts:**
    * **ERC-20 Token Contract (e.g., `MyToken.sol`):** This contract represents the testnet token (MTT) that the faucet distributes. It's funded by the faucet owner.
    * **Faucet Contract (e.g., `MonadFaucet.sol`):** This smart contract holds the MTT tokens and contains the logic for dispensing them. It enforces a cooldown period for token requests. The backend interacts directly with this contract.
    * **ERC-721 NFT Contract (e.g., `MyNFT.sol`):** This contract defines the NFT that users must own to be eligible to request tokens from the faucet.
2.  **Backend (Node.js/Express):**
    * Provides RESTful API endpoints for the frontend.
    * **NFT Ownership Verification:** Receives a wallet address from the frontend and queries the `MyNFT` contract on the Monad testnet to check if the address holds any NFTs from the specified contract.
    * **Token Request Handling:** When a user requests tokens, the backend first verifies NFT ownership. If eligible, it then calls the `requestTokens` function on the deployed `MonadFaucet` smart contract, which handles the actual token transfer and cooldown enforcement on-chain.
    * **Explorer Functionality:** Offers endpoints to retrieve transaction details and address balances directly from the Monad testnet via the Ethers.js provider.
3.  **Frontend (React.js):**
    * Presents a dark-themed, user-friendly interface.
    * Allows users to input their wallet address to check for required NFT ownership.
    * Enables users to request MTT tokens from the faucet once NFT ownership is verified.
    * Provides a quick explorer to look up transaction hashes or wallet addresses on the Monad testnet.
    * Communicates with the backend API for all blockchain-related operations.

## Setup and Running

To get Monad Spring running, you will need to deploy the necessary smart contracts to the Monad testnet and then configure both the backend and frontend.

**Note:** This project assumes you have already deployed your `MyToken.sol`, `MonadFaucet.sol`, and `MyNFT.sol` smart contracts to the Monad testnet and have their respective contract addresses. You will also need a private key for the wallet that owns and funds the faucet contract.

### Prerequisites

* Node.js (v18 or higher recommended)
* npm (or yarn)

### 1. Backend Setup

1.  Navigate to the project's root directory.
2.  Install backend dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory and add your Monad Testnet RPC URL and the private key of your faucet's owner wallet:
    ```
    MONAD_RPC_URL="[https://testnet-rpc.monad.xyz](https://testnet-rpc.monad.xyz)"
    FAUCET_PRIVATE_KEY="YOUR_FAUCET_WALLET_PRIVATE_KEY"
    FAUCET_CONTRACT_ADDRESS="0xYourDeployedMonadFaucetContractAddressHere"
    REQUIRED_NFT_CONTRACT_ADDRESS_BACKEND="0xYourDeployedMyNFTContractAddressHere"
    ```
4.  Update `server.js`:
    * Ensure `FAUCET_CONTRACT_ADDRESS` and `REQUIRED_NFT_CONTRACT_ADDRESS_BACKEND` are set to your actual deployed contract addresses.
    * **Crucially, update `FAUCET_CONTRACT_ABI`** with the actual ABI of your deployed `MonadFaucet.sol` contract.

5.  Start the backend server:
    ```bash
    node server.js
    ```

### 2. Frontend Setup

1.  Navigate to the `client` directory:
    ```bash
    cd client
    ```
2.  Install frontend dependencies:
    ```bash
    npm install
    ```
3.  Update `client/src/App.js`:
    * Replace `0xYourDeployedMyNFTContractAddressHere` with your actual deployed `MyNFT` contract address.
    * Replace `https://YOUR_HEROKU_APP_NAME.herokuapp.com/api` with your actual Heroku Backend API URL.
    * (Optional) Ensure `client/public/favicon.ico` and `client/public/wallet-icon.png` (or your chosen wallet icon image) exist for the UI.

4.  Start the frontend application (for local development):
    ```bash
    npm start
    ```
5.  To deploy the frontend to GitHub Pages:
    ```bash
    npm run deploy
    ```

The application should now be running and accessible in your browser, allowing you to interact with the Monad Spring faucet and explorer.

## Contributing

Feel free to fork this repository, open issues, or submit pull requests.

## License

This project is open-source and available under the MIT License.

---

**Social Media:**

* **Twitter:** [@akk\_0x04](https://x.com/akk_0x04)
* **GitHub:** [akkaungkyawkhaing](https://github.com/akkaungkyawkhaing)
