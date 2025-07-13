// client/src/App.js
import React, { useState, useEffect } from 'react';
// Import icons from lucide-react
import { Wallet, Search, Clock, DollarSign, Activity, AlertCircle, CheckCircle, Image, ExternalLink, Twitter, Github } from 'lucide-react';

function App() {
  // Faucet related states
  const [faucetAddress, setFaucetAddress] = useState('');
  const [faucetMessage, setFaucetMessage] = useState('');
  const [faucetError, setFaucetError] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // Cooldown time in milliseconds

  // New states for NFT Ownership Check
  const [nftCheckAddress, setNftCheckAddress] = useState(''); // User's wallet address for NFT check
  const [hasNFT, setHasNFT] = useState(false);
  const [nftCheckMessage, setNftCheckMessage] = useState('');
  const [nftCheckError, setNftCheckError] = useState('');
  // Placeholder NFT Contract Address (User needs to replace this)
  const REQUIRED_NFT_CONTRACT_ADDRESS = "0x711e498a081bfed449ea047cc28a7fe34f3707ac"; // <<< REPLACE THIS with your deployed ERC-721 NFT contract on Monad Testnet
  const MINT_NFT_LINK = "https://remix.ethereum.org/"; // Generic link to Remix for deploying/minting NFTs

  // Explorer related states
  const [explorerInput, setExplorerInput] = useState('');
  const [explorerResult, setExplorerResult] = useState(null);
  const [explorerError, setExplorerError] = useState('');

  // Base URL for the backend API
  // const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
  // client/src/App.js

  const API_BASE_URL = 'https://monadspring-9fd378cab39f.herokuapp.com/api' || 'http://localhost:5000/api';


  // --- Cooldown Countdown Timer ---
  useEffect(() => {
    let timer;
    if (cooldownRemaining > 0) {
      timer = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // --- NFT Ownership Check Handler ---
  const handleCheckNFT = async () => {
    setNftCheckMessage('');
    setNftCheckError('');
    setHasNFT(false);

    if (!nftCheckAddress) {
      setNftCheckError('Please enter your wallet address to check for NFT ownership.');
      return;
    }
    if (!nftCheckAddress.startsWith('0x') || nftCheckAddress.length !== 42) {
      setNftCheckError('Invalid wallet address format.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/check-nft-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: nftCheckAddress,
          nftContractAddress: REQUIRED_NFT_CONTRACT_ADDRESS
        }),
      });
      const data = await response.json();

      if (data.success) {
        if (data.hasNFT) {
          setHasNFT(true);
          setNftCheckMessage('NFT found in your wallet! You can now request tokens.');
        } else {
          setHasNFT(false);
          setNftCheckError('NFT not found in your wallet. Please mint one to proceed.');
        }
      } else {
        setNftCheckError(data.message || 'NFT check failed. Please try again.');
      }
    } catch (error) {
      console.error('NFT check error:', error);
      setNftCheckError('Could not connect to the backend for NFT check.');
    }
  };

  // --- Faucet Request Handler ---
  const handleFaucetRequest = async () => {
    setFaucetMessage('');
    setFaucetError('');
    setCooldownRemaining(0);

    if (!hasNFT) {
      setFaucetError('Please ensure you own the required NFT first.');
      return;
    }

    if (!faucetAddress) {
      setFaucetError('Please enter a Monad address.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: faucetAddress }),
      });
      const data = await response.json();

      if (data.success) {
        setFaucetMessage(`Success! Tx Hash: ${data.txHash}`);
        setFaucetAddress('');
      } else {
        setFaucetError(data.message || 'Faucet request failed.');
        if (data.remainingTime) {
          setCooldownRemaining(data.remainingTime);
        }
      }
    } catch (error) {
      console.error('Faucet request error:', error);
      setFaucetError('Could not connect to the backend or request failed. Please check server status.');
    }
  };

  // --- Helper Function: Format milliseconds into HH:MM:SS ---
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  };

  // --- Explorer Search Handler ---
  const handleExplorerSearch = async () => {
    setExplorerResult(null);
    setExplorerError('');
    if (!explorerInput) {
      setExplorerError('Please enter a transaction hash or address.');
      return;
    }

    try {
      let response;
      if (explorerInput.startsWith('0x') && explorerInput.length === 66) {
        response = await fetch(`${API_BASE_URL}/explorer/transaction/${explorerInput}`);
      } else if (explorerInput.startsWith('0x') && explorerInput.length === 42) {
        response = await fetch(`${API_BASE_URL}/explorer/address/${explorerInput}`);
      } else {
        setExplorerError('Invalid input. Please enter a valid transaction hash (66 chars) or address (42 chars).');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setExplorerResult(data);
      } else {
        setExplorerError(data.message || 'Search failed. Please check the input and try again.');
      }
    } catch (error) {
      console.error('Explorer search error:', error);
      setExplorerError('Could not connect to the backend or search failed.');
    }
  };

  // --- Main Render ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4"> {/* Main background is dark gray */}
      <div className="bg-gray-800 rounded-xl shadow-xl p-8 md:p-10 w-full max-w-4xl space-y-8 border border-purple-800"> {/* Main card background is dark gray with purple border */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-purple-400 mb-8 flex items-center justify-center gap-3"> {/* Lighter purple for main title */}
        <img
            src={process.env.PUBLIC_URL + '/favicon.ico'} // Path to favicon.ico in the public folder
            alt="Monad Spring Icon"
            className="w-10 h-10 md:w-12 md:h-12" // Apply Tailwind classes for sizing
          />
          Monad Spring
        </h1>

        {/* Monad Testnet Faucet Section */}
        <section className="bg-gray-900 rounded-lg shadow-inner p-6 border border-purple-700"> {/* Darker background for sections, purple border */}
          <h2 className="text-2xl font-semibold text-gray-200 mb-4 flex items-center justify-center gap-2"> {/* Light gray text */}
            <DollarSign className="w-6 h-6 text-green-400" /> {/* Green for clarity */}
            Monad Testnet Faucet
          </h2>
          <p className="text-gray-400 mb-4 text-sm md:text-base"> {/* Lighter gray text */}
            Get <strong className="font-semibold text-white">0.01 MON</strong> token per request. Daily limit: <strong className="font-semibold text-white">0.01 MON</strong> per address. Cooldown: <strong className="font-semibold text-white">24 hours</strong>.
          </p>

          {/* NFT Ownership Check Section */}
          <div className="mb-6 p-4 bg-gray-800 rounded-md border border-purple-600"> {/* Slightly lighter dark background, purple border */}
            <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2"> {/* Light gray text */}
              <Image className="w-5 h-5 text-purple-400" /> {/* Purple icon */}
              Step 1: Own Required NFT
            </h3>
            <p className="text-gray-400 text-sm mb-3"> {/* Lighter gray text */}
              To request tokens, you must own an NFT from the contract address: <code className="bg-gray-700 text-purple-300 p-1 rounded text-xs break-all">{REQUIRED_NFT_CONTRACT_ADDRESS}</code> {/* Darker code background, purple text */}
            </p>
            <p className="text-gray-400 text-sm mb-3"> {/* Lighter gray text */}
              Don't have one? <a href={MINT_NFT_LINK} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline font-medium inline-flex items-center gap-1"> {/* Purple link */}
                Mint an NFT here <ExternalLink className="w-4 h-4" />
              </a>
            </p>
            <input
              type="text"
              placeholder="Your Wallet Address (0x...)"
              className="w-full p-3 mb-3 border border-purple-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
              value={nftCheckAddress}
              onChange={(e) => setNftCheckAddress(e.target.value)}
              disabled={hasNFT}
            />
            <button
              onClick={handleCheckNFT}
              disabled={hasNFT || !nftCheckAddress || nftCheckAddress.length !== 42 || !nftCheckAddress.startsWith('0x')}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-bold text-md hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {hasNFT ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  NFT Owned!
                </>
              ) : (
                <>
                  <Image className="w-5 h-5" />
                  Check NFT Ownership
                </>
              )}
            </button>
            {nftCheckMessage && (
              <p className="text-green-400 font-medium mt-3 flex items-center justify-center gap-2"> {/* Green for success */}
                <CheckCircle className="w-5 h-5" />
                {nftCheckMessage}
              </p>
            )}
            {nftCheckError && (
              <p className="text-red-400 font-medium mt-3 flex items-center justify-center gap-2"> {/* Red for error */}
                <AlertCircle className="w-5 h-5" />
                {nftCheckError}
              </p>
            )}
          </div>

          {/* Faucet Request Section */}
          <h3 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2"> {/* Light gray text */}
            <Wallet className="w-5 h-5 text-purple-400" /> {/* Purple icon */}
            Step 2: Request Tokens
          </h3>
          <input
            type="text"
            placeholder="Enter your Monad Address (0x...)"
            className="w-full p-3 mb-4 border border-purple-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none" 
            value={faucetAddress}
            onChange={(e) => setFaucetAddress(e.target.value)}
            disabled={!hasNFT}
          />
          <button
            onClick={handleFaucetRequest}
            disabled={cooldownRemaining > 0 || !hasNFT || !faucetAddress || faucetAddress.length !== 42 || !faucetAddress.startsWith('0x')}
            className="w-full bg-purple-700 text-white py-3 px-6 rounded-lg font-bold text-lg hover:bg-purple-800 transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
          >
            {cooldownRemaining > 0 ? (
              <>
                <Clock className="w-5 h-5" />
                Please Wait: {formatTime(cooldownRemaining)}
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                Get MON Tokens
              </>
            )}
          </button>
          {faucetMessage && (
            <p className="text-green-400 font-medium mt-4 flex items-center justify-center gap-2"> {/* Green for success */}
              <CheckCircle className="w-5 h-5" />
              {faucetMessage}
            </p>
          )}
          {faucetError && (
            <p className="text-red-400 font-medium mt-4 flex items-center justify-center gap-2"> {/* Red for error */}
              <AlertCircle className="w-5 h-5" />
              {faucetError}
            </p>
          )}
        </section>

        {/* Quick Explorer Section */}
        <section className="bg-gray-900 rounded-lg shadow-inner p-6 border border-purple-700"> {/* Darker background for sections, purple border */}
          <h2 className="text-2xl font-semibold text-gray-200 mb-4 flex items-center justify-center gap-2"> {/* Light gray text */}
            <Search className="w-6 h-6 text-purple-400" /> {/* Purple icon */}
            Quick Explorer
          </h2>
          <input
            type="text"
            placeholder="Enter Tx Hash or Address"
            className="w-full p-3 mb-4 border border-purple-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none" 
            value={explorerInput}
            onChange={(e) => setExplorerInput(e.target.value)}
          />
          <button
            onClick={handleExplorerSearch}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-bold text-lg hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2" 
          >
            <Search className="w-5 h-5" />
            Search
          </button>
          {explorerResult ? (
            <div className="explorer-results text-left mt-6 pt-4 border-t border-purple-600 text-gray-300 space-y-2"> {/* Purple border, light gray text */}
              {explorerResult.transaction && (
                <>
                  <h3 className="text-xl font-semibold text-gray-200 flex items-center gap-2"> {/* Light gray text */}
                    <Activity className="w-5 h-5 text-purple-400" /> {/* Purple icon */}
                    Transaction Details:
                  </h3>
                  <p><strong className="font-medium">Hash:</strong> <span className="break-all">{explorerResult.transaction.hash}</span></p>
                  <p><strong className="font-medium">From:</strong> <span className="break-all">{explorerResult.transaction.from}</span></p>
                  <p><strong className="font-medium">To:</strong> <span className="break-all">{explorerResult.transaction.to}</span></p>
                  <p><strong className="font-medium">Value:</strong> {parseFloat(explorerResult.transaction.value) / 1e18} MON</p>
                  <p><strong className="font-medium">Block Number:</strong> {explorerResult.transaction.blockNumber}</p>
                  <p><strong className="font-medium">Status:</strong> {explorerResult.receipt?.status === 1 ? 'Success' : 'Failed'}</p>
                  <p>
                    <a href={`https://testnet.monadexplorer.com/tx/${explorerResult.transaction.hash}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline flex items-center gap-1"> {/* Purple link */}
                      View on Explorer
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </a>
                  </p>
                </>
              )}
              {explorerResult.address && (
                <>
                  <h3 className="text-xl font-semibold text-gray-200 flex items-center gap-2"> {/* Light gray text */}
                    <Wallet className="w-5 h-5 text-purple-400" /> {/* Purple icon */}
                    Address Details:
                  </h3>
                  <p><strong className="font-medium">Address:</strong> <span className="break-all">{explorerResult.address}</span></p>
                  <p><strong className="font-medium">Balance:</strong> {explorerResult.balance} MON</p>
                  <p>
                    <a href={`https://testnet.monadexplorer.com/address/${explorerResult.address}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline flex items-center gap-1"> {/* Purple link */}
                      View on Explorer
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    </a>
                  </p>
                </>
              )}
            </div>
          ) : explorerError ? (
            <p className="text-red-400 font-medium flex items-center justify-center gap-2"> {/* Red for error */}
              <AlertCircle className="w-5 h-5" />
              {explorerError}
            </p>
          ) : (
            <p className="text-gray-400">Search results will appear here.</p>
          )}
        </section>
      </div>

      {/* Footer Section */}
      <footer className="w-full max-w-4xl mt-8 p-4 bg-gray-950 text-white rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 border border-purple-900"> {/* Darker footer background, purple border */}
        <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Monad Spring. All rights reserved.</p> {/* Lighter gray text */}
        <div className="flex space-x-4">
          <a href="https://x.com/akk_0x04" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-300 transition-colors duration-200"> {/* Lighter purple hover */}
            <Twitter className="w-6 h-6" />
          </a>
          <a href="https://github.com/akkaungkyawkhaing" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-300 transition-colors duration-200">
            <Github className="w-6 h-6" />
          </a>
          {/* Add more social links as needed */}
        </div>
      </footer>
    </div>
  );
}

export default App;
