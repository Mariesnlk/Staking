# Advanced Sample Hardhat Project

This project demonstrates an advanced Hardhat use case, integrating other tools commonly used alongside Hardhat in the ecosystem.

The project comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts. It also comes with a variety of other tools, preconfigured to work with the project code.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.ts
TS_NODE_FILES=true npx ts-node scripts/deploy.ts
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.ts
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

# Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).

# Deploy 

Token deployed to: 0x82BD6cba3AA10cD100895aa8122bc9768b4e8D15
Vendor deployed to: 0xF1F87140935E2499B94AFA1407C7bB80f432e3C9
Staking deployed to: 0xEBa254acC7D9AD5826039f73474673e4e6aFe843

# Verification
Generating typings for: 12 artifacts in dir: typechain for target: ethers-v5
Successfully generated 21 typings!
Compiled 12 Solidity files successfully
Successfully submitted source code for contract
contracts/StakingToken.sol:StakingToken at 0x82BD6cba3AA10cD100895aa8122bc9768b4e8D15
for verification on the block explorer. Waiting for verification result...

Successfully verified contract StakingToken on Etherscan.
https://ropsten.etherscan.io/address/0x82BD6cba3AA10cD100895aa8122bc9768b4e8D15#code

Successfully submitted source code for contract
contracts/Vendor.sol:Vendor at 0xF1F87140935E2499B94AFA1407C7bB80f432e3C9
for verification on the block explorer. Waiting for verification result...

Successfully verified contract Vendor on Etherscan.
https://ropsten.etherscan.io/address/0xF1F87140935E2499B94AFA1407C7bB80f432e3C9#code

Successfully submitted source code for contract
contracts/Staking.sol:Staking at 0xEBa254acC7D9AD5826039f73474673e4e6aFe843
for verification on the block explorer. Waiting for verification result...

Successfully verified contract Staking on Etherscan.
https://ropsten.etherscan.io/address/0xEBa254acC7D9AD5826039f73474673e4e6aFe843#code
