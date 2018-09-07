# Limepay Escrow Contract

This repo represents the production grade smart contracts needed to achieve trustless escrow system. This system has several goals:
- Be an escrow for a client dapp funds for the Limepay system without giving any control to it to Limepay
- Be able to maintain the atomic properties that Limepay emulates by not allowing the client to retract their intent to fund a user
- Be as cheap as possible to create and run without compromising the security of the contract

## Signed messages
The main technique that this smart contract system works is called "signed intent messages". This is cryptographically signed data that can be used by the smart contract to deterministically prove the intent of the signer.

In our case this message will be the intent by the client to fund X amount of tokens and Y amount of ETH to a given recipient. Once Limepay has this intent message signed it is submitted to the smart contract and verified.

## Contract as an escrow

### Contract creation
The contract is created via issuance of different type of signed intent message. This message is used to determine an initial signer that is going to be accepted by the smart contract.

### Funding a user
The smart contract receives all the intent data - transactionIdHash, recipient, tokenContract, token amount and wei amount and intent signature. Once this signature is proved to be signed by a valid signer the funding of the recipient goes through.

### transactionIdHash
In order to prevent malicious party to resubmit the publicly visible data to this smart contract and forcefully extract data, an associated fiat payment transactionId is required. This transactionId should be hashed to augment any sensitive data, but is marked used and no transaction with the same transactionIdHash goes through. Thus a replay attack is guarded against.

### Relayer reward
As Limepay sends the funding transaction while synchronizing all the funding flows, the transaction costs are required to be paid by Limepay. This occurs additional costs for the service.

The escrow smart contract sends back ETH covering this transaction cost to the msg.sender of the fund transaction.

## Proxies and delegate calls
In order to make the creation of such contracts as cheap as possible, a pattern similar to Gnosis Safe is used. There is a master copy escrow contract deployed once and for every client we are deploying a proxy. This proxy uses the master copy as main source of logic via the famous delegatecall opcode. As the proxy contract is very thin, the creation of an escrow contract for the client is very cheap.

## About this repo
This repo contains the smart contracts, deployment script for the master smart contract and >90% code coverage unit tests (aiming to go to 100%);

`Etherlime` is the development framework of this repo. In order to run the tests or deployment scripts first install etherlime globaly:

`npm i -g etherlime`

### Tests
`etherlime test`

### Coverage
`etherlime coverage --runs=999`

### Deploying
1. `etherlime ganache`
2. `etherlime deploy`


