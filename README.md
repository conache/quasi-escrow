# 🌱 Project idea

Implement a quasi escrow smart contract that represents a legal agreement designed to protect buyers and sellers in a transaction that takes at least three variables as input `_address`, `_timePeriod`, and `_amount`.

Smart Contract should allow to deposit of some amount of ERC20 tokens for a specified address and allow withdrawal after a certain defined time.

**Main restrictions**

- withdraw should be only allowed when `_timePeriod` occurs
- the allowed amount that could be withdrawn is defined by `_timePeriod`
- permission to withdraw should be defined by `_address`

# 🚀 Development instructions

- Run `npm install` beforehand
- If you want to run the deployment script: setup `.env` file as in `env.example`

To compile the smart contracts:

`npx hardhat compile`

<br/>

To run tests:

`npx hardhat test`

<br/>

To check coverage metrics:

`npx hardhat coverage`

<br/>

To check the contract sizes:

`npx hardhat size-contracts`

<br/>

To deploy:

`npx hardhat run ./scripts/deploy.js --network goerli `
