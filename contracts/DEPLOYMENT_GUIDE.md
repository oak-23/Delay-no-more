# QDay Smart Contract Deployment Guide

Since QDay is an EVM-compatible Layer 2 on the Abelian Network, we use standard Ethereum tooling to deploy our smart contract.

## Prerequisites

1. Add QDay Testnet to MetaMask
   - Network Name: QDay Testnet (New)
   - RPC URL: `https://rpc.qday.info` 
   - Chain ID: `44003`
2. Get QDay Testnet Tokens
   - Go to the QDay Faucet: [https://faucet.qday.info](https://faucet.qday.info) (or try the main QDay community portal)
   - Input your MetaMask wallet address and request test tokens to pay for gas.

## Deployment using Remix IDE (Fastest Web method)

1. Open your browser and go to [Remix IDE (remix.ethereum.org)](https://remix.ethereum.org).
2. Create a new Workspace.
3. In the \`contracts\` folder, create a new file named \`AbelianAIAuthenticator.sol\`.
4. Copy the entire contents of \`contracts/AbelianAIAuthenticator.sol\` from this project and paste it into Remix.
5. In Remix, go to the **"Solidity Compiler"** tab (the icon looks like a standard "S").
   - **CRITICAL FIX**: Make sure the compiler version is set to exactly `0.8.19`. Do NOT use `0.8.20` or higher, as the QDay Testnet does not support the new `PUSH0` EVM opcode yet which will cause your transactions to silently fail with internal errors. 
   - Expand "Advanced Configurations" and ensure **EVM Version** is set to `paris` (or default for 0.8.19).
   - Click **"Compile AbelianAIAuthenticator.sol"**.
6. Go to the **"Deploy & Run Transactions"** tab:
   - Expand the **"Environment"** dropdown and select **"Injected Provider - MetaMask"**.
   - Your MetaMask will pop up asking you to connect. Approve it. *(Ensure MetaMask is set to the QDay Testnet)*.
   - Under "Contract", ensure \`AbelianAIAuthenticator\` is selected.
   - In the \`Deploy\` section, you'll see a box next to it for \`initialOwner\`. Paste your own MetaMask Wallet Address here.
   - Click the orange **"transact"** button.
   - MetaMask will prompt you to confirm the deployment gas fee. Confirm it.
7. Once deployed, look at the terminal at the bottom of Remix. It will say **"creation of AbelianAIAuthenticator pending..."** and then succeed.
8. Look under **"Deployed Contracts"** in the sidebar.
9. **CRITICAL:** Click the **"Copy"** icon next to the Contract address.

## Final Step
Take the copied **Contract Address** and update your Next.js application codebase with it (I will use it to link your frontend).
