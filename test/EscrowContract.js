const etherlime = require('etherlime');
const ethers = require('ethers');

const MockToken = require('../build/MockToken.json');
const ECTools = require('../build/ECTools.json');
const EscrowProxy = require('../build/EscrowProxy.json');
const EscrowContract = require('../build/EscrowContract.json');
const IEscrowContract = require('../build/IEscrowContract.json');

describe('Escrow Contract', () => {
    let signer = accounts[3];
    let nonSigner = accounts[4];
    let deployer;

    let escrowProxyWrapper;
    let proxyEscrowContract;

    const transactionIdHash = '0x751a77be2d8bd902c45a8ab61a330a1524703e8423b6d2e4a8ef0a03cc1952bc';
    const tokensToSend = ethers.utils.bigNumberify('1000000000');
    const weiToSend = ethers.utils.bigNumberify('1000000000');

    let recipient;

    describe('Funding the escrow contract', () => {

        it('should be able to accept ETH', async () => {
            deployer = new etherlime.EtherlimeGanacheDeployer();
            deployer.defaultOverrides = {
                gasLimit: 4700000
            }
            mockTokenWrapper = await deployer.deploy(MockToken);
            const ECToolsWrapper = await deployer.deploy(ECTools);
            escrowContractMasterCopy = await deployer.deploy(EscrowContract, {
                ECTools: ECToolsWrapper.contractAddress
            });

            signer.wallet = new ethers.Wallet(signer.secretKey);

            const addressHash = ethers.utils.solidityKeccak256(['address'], [signer.wallet.address]);
            const addressHashBytes = ethers.utils.arrayify(addressHash);
            const addressSig = signer.wallet.signMessage(addressHashBytes);

            escrowProxyWrapper = await deployer.deploy(EscrowProxy, {}, escrowContractMasterCopy.contractAddress, addressHash, addressSig)

            await deployer.wallet.sendTransaction({
                to: escrowProxyWrapper.contractAddress,
                value: weiToSend
            })

            const proxyWeiBalance = await deployer.provider.getBalance(escrowProxyWrapper.contractAddress);

            assert(proxyWeiBalance.eq(weiToSend), 'Incorrect wei balance remaining in the contract');

        })
    })

    describe('Funding a user', () => {

        beforeEach(async () => {
            deployer = new etherlime.EtherlimeGanacheDeployer();
            deployer.defaultOverrides = {
                gasLimit: 4700000
            }
            mockTokenWrapper = await deployer.deploy(MockToken);
            const ECToolsWrapper = await deployer.deploy(ECTools);
            escrowContractMasterCopy = await deployer.deploy(EscrowContract, {
                ECTools: ECToolsWrapper.contractAddress
            });

            const addressHash = ethers.utils.solidityKeccak256(['address'], [signer.wallet.address]);
            const addressHashBytes = ethers.utils.arrayify(addressHash);
            const addressSig = signer.wallet.signMessage(addressHashBytes);

            escrowProxyWrapper = await deployer.deploy(EscrowProxy, {}, escrowContractMasterCopy.contractAddress, addressHash, addressSig)
            proxyEscrowContract = deployer.wrapDeployedContract(IEscrowContract, escrowProxyWrapper.contractAddress).contract;

            await mockTokenWrapper.contract.mint(proxyEscrowContract.address, tokensToSend.mul(2));
            await deployer.wallet.sendTransaction({
                to: proxyEscrowContract.address,
                value: weiToSend.mul(2)
            })

            recipient = ethers.Wallet.createRandom();

        });

        it('should fund correctly', async () => {

            const authorizationHash = ethers.utils.solidityKeccak256(['bytes32', 'address', 'address', 'uint256', 'uint256'], [transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend]);

            const authorizationHashBytes = ethers.utils.arrayify(authorizationHash);
            const authorizationSignature = signer.wallet.signMessage(authorizationHashBytes);
            await proxyEscrowContract.fund(transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend, authorizationSignature);

            const proxyTokenBalance = await mockTokenWrapper.contract.balanceOf(proxyEscrowContract.address);
            const proxyWeiBalance = await deployer.provider.getBalance(proxyEscrowContract.address);

            assert(proxyTokenBalance.eq(tokensToSend), 'Incorrect token balance remaining in the contract');
            assert(proxyWeiBalance.eq(weiToSend), 'Incorrect wei balance remaining in the contract');

            const recipientTokenBalance = await mockTokenWrapper.contract.balanceOf(recipient.address);
            const recipientWeiBalance = await deployer.provider.getBalance(recipient.address);

            assert(recipientTokenBalance.eq(tokensToSend), 'Incorrect token balance remaining in the recipient');
            assert(recipientWeiBalance.eq(weiToSend), 'Incorrect wei balance remaining in the recipient');

        });

        it('should not fund the same transaction twice', async () => {

            const authorizationHash = ethers.utils.solidityKeccak256(['bytes32', 'address', 'address', 'uint256', 'uint256'], [transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend]);

            const authorizationHashBytes = ethers.utils.arrayify(authorizationHash);
            const authorizationSignature = signer.wallet.signMessage(authorizationHashBytes);
            await proxyEscrowContract.fund(transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend, authorizationSignature);
            await assert.revert(proxyEscrowContract.fund(transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend, authorizationSignature));

            const proxyTokenBalance = await mockTokenWrapper.contract.balanceOf(proxyEscrowContract.address);
            const proxyWeiBalance = await deployer.provider.getBalance(proxyEscrowContract.address);

            assert(proxyTokenBalance.eq(tokensToSend), 'Incorrect token balance remaining in the contract');
            assert(proxyWeiBalance.eq(weiToSend), 'Incorrect wei balance remaining in the contract');

            const recipientTokenBalance = await mockTokenWrapper.contract.balanceOf(recipient.address);
            const recipientWeiBalance = await deployer.provider.getBalance(recipient.address);

            assert(recipientTokenBalance.eq(tokensToSend), 'Incorrect token balance remaining in the recipient');
            assert(recipientWeiBalance.eq(weiToSend), 'Incorrect wei balance remaining in the recipient');

        });

        it('should not fund from invalid signer', async () => {

            const authorizationHash = ethers.utils.solidityKeccak256(['bytes32', 'address', 'address', 'uint256', 'uint256'], [transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend]);

            const authorizationHashBytes = ethers.utils.arrayify(authorizationHash);
            const authorizationSignature = nonSigner.wallet.signMessage(authorizationHashBytes);
            await assert.revert(proxyEscrowContract.fund(transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend, authorizationSignature));

        });

        it('limepay cannot replace receiver', async () => {

            const authorizationHash = ethers.utils.solidityKeccak256(['bytes32', 'address', 'address', 'uint256', 'uint256'], [transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend]);

            const authorizationHashBytes = ethers.utils.arrayify(authorizationHash);
            const authorizationSignature = signer.wallet.signMessage(authorizationHashBytes);
            await assert.revert(proxyEscrowContract.fund(transactionIdHash, nonSigner.wallet.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend, authorizationSignature));

        });

        it('limepay cannot replace token contract', async () => {

            const authorizationHash = ethers.utils.solidityKeccak256(['bytes32', 'address', 'address', 'uint256', 'uint256'], [transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend]);

            const authorizationHashBytes = ethers.utils.arrayify(authorizationHash);
            const authorizationSignature = signer.wallet.signMessage(authorizationHashBytes);
            await assert.revert(proxyEscrowContract.fund(transactionIdHash, recipient.address, nonSigner.wallet.address, tokensToSend, weiToSend, authorizationSignature));

        });


        it('limepay cannot replace tokens amount', async () => {

            const authorizationHash = ethers.utils.solidityKeccak256(['bytes32', 'address', 'address', 'uint256', 'uint256'], [transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend]);

            const authorizationHashBytes = ethers.utils.arrayify(authorizationHash);
            const authorizationSignature = signer.wallet.signMessage(authorizationHashBytes);
            await assert.revert(proxyEscrowContract.fund(transactionIdHash, recipient.address, nonSigner.wallet.address, tokensToSend.mul(2), weiToSend, authorizationSignature));

        });

        it('limepay cannot replace wei amount', async () => {

            const authorizationHash = ethers.utils.solidityKeccak256(['bytes32', 'address', 'address', 'uint256', 'uint256'], [transactionIdHash, recipient.address, mockTokenWrapper.contractAddress, tokensToSend, weiToSend]);

            const authorizationHashBytes = ethers.utils.arrayify(authorizationHash);
            const authorizationSignature = signer.wallet.signMessage(authorizationHashBytes);
            await assert.revert(proxyEscrowContract.fund(transactionIdHash, recipient.address, nonSigner.wallet.address, tokensToSend, weiToSend.mul(2), authorizationSignature));

        });

        xit('should reward limepay for relay', async () => {
            // TODO Veselin add this


        })

    })

    describe('Signer recovery', () => {
        beforeEach(async () => {
            deployer = new etherlime.EtherlimeGanacheDeployer();
            deployer.defaultOverrides = {
                gasLimit: 4700000
            }
            mockTokenWrapper = await deployer.deploy(MockToken);
            const ECToolsWrapper = await deployer.deploy(ECTools);
            escrowContractMasterCopy = await deployer.deploy(EscrowContract, {
                ECTools: ECToolsWrapper.contractAddress
            });

            const addressHash = ethers.utils.solidityKeccak256(['address'], [signer.wallet.address]);
            const addressHashBytes = ethers.utils.arrayify(addressHash);
            const addressSig = signer.wallet.signMessage(addressHashBytes);

            escrowProxyWrapper = await deployer.deploy(EscrowProxy, {}, escrowContractMasterCopy.contractAddress, addressHash, addressSig)
            proxyEscrowContract = deployer.wrapDeployedContract(IEscrowContract, escrowProxyWrapper.contractAddress).contract;

        });

        it('should get signer correctly', async () => {

            const testHash = ethers.utils.solidityKeccak256(['bytes32'], [transactionIdHash]);

            const testHashBytes = ethers.utils.arrayify(testHash);
            const testSignature = signer.wallet.signMessage(testHashBytes);
            const recoveredAddress = await proxyEscrowContract.getSigner(testHash, testSignature);

            assert.strictEqual(recoveredAddress, signer.wallet.address, 'Incorrect signer was recovered');

        });
    })

    describe('Signer management', () => {

        let signerProxyEscrowContract;
        beforeEach(async () => {
            deployer = new etherlime.EtherlimeGanacheDeployer();
            deployer.defaultOverrides = {
                gasLimit: 4700000
            }
            mockTokenWrapper = await deployer.deploy(MockToken);
            const ECToolsWrapper = await deployer.deploy(ECTools);
            escrowContractMasterCopy = await deployer.deploy(EscrowContract, {
                ECTools: ECToolsWrapper.contractAddress
            });

            const addressHash = ethers.utils.solidityKeccak256(['address'], [signer.wallet.address]);
            const addressHashBytes = ethers.utils.arrayify(addressHash);
            const addressSig = signer.wallet.signMessage(addressHashBytes);

            escrowProxyWrapper = await deployer.deploy(EscrowProxy, {}, escrowContractMasterCopy.contractAddress, addressHash, addressSig)
            proxyEscrowContract = deployer.wrapDeployedContract(IEscrowContract, escrowProxyWrapper.contractAddress).contract;

            await mockTokenWrapper.contract.mint(proxyEscrowContract.address, tokensToSend.mul(2));
            await deployer.wallet.sendTransaction({
                to: proxyEscrowContract.address,
                value: weiToSend.mul(2)
            })

            recipient = ethers.Wallet.createRandom();

            signer.wallet.provider = deployer.provider;

            signerProxyEscrowContract = proxyEscrowContract.connect(signer.wallet);
        });

        it('should add signer correctly', async () => {

            await signerProxyEscrowContract.makeSigner(recipient.address, true);

            const isSigner = await proxyEscrowContract.isSigner(recipient.address);

            assert.isOk(isSigner, 'The recipient was not made signer');
        });

        it('should fail on adding signer of nonSigner', async () => {

            await assert.revert(proxyEscrowContract.makeSigner(recipient.address, true));

            const isSigner = await proxyEscrowContract.isSigner(recipient.address);

            assert.isOk(!isSigner, 'The recipient was incorrectly made signer');
        });

        it('should remove signer correctly', async () => {

            await signerProxyEscrowContract.makeSigner(recipient.address, true);

            const isSigner = await proxyEscrowContract.isSigner(recipient.address);

            assert.isOk(isSigner, 'The recipient was not made signer');

            await signerProxyEscrowContract.makeSigner(recipient.address, false);

            const isSignerAfter = await proxyEscrowContract.isSigner(recipient.address);

            assert.isOk(!isSignerAfter, 'The recipient is still signer');
        });

        it('should remove signer correctly', async () => {

            await signerProxyEscrowContract.makeSigner(recipient.address, true);

            const isSigner = await proxyEscrowContract.isSigner(recipient.address);

            assert.isOk(isSigner, 'The recipient was not made signer');

            await assert.revert(proxyEscrowContract.makeSigner(recipient.address, false));

            const isSignerAfter = await proxyEscrowContract.isSigner(recipient.address);

            assert.isOk(isSignerAfter, 'The recipient was incorrectly removed');
        });

    })

});