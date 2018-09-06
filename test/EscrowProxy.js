const etherlime = require('etherlime');
const ethers = require('ethers');

const MockToken = require('../build/MockToken.json');
const ECTools = require('../build/ECTools.json');
const EscrowProxy = require('../build/EscrowProxy.json');
const EscrowContract = require('../build/EscrowContract.json');
const IEscrowContract = require('../build/IEscrowContract.json');

describe('Escrow proxy', () => {
    let signer = accounts[3];
    let nonSigner = accounts[4];
    let deployer;

    let escrowContractMasterCopy;

    describe('Setting up of proxy', () => {

        beforeEach(async () => {
            deployer = new etherlime.EtherlimeGanacheDeployer();
            deployer.defaultOverrides = {
                gasLimit: 4700000
            }
            const ECToolsWrapper = await deployer.deploy(ECTools);
            escrowContractMasterCopy = await deployer.deploy(EscrowContract, {
                ECTools: ECToolsWrapper.contractAddress
            });
        });

        it('should deploy proxy and initialize it correctly', async () => {
            const signerWallet = new ethers.Wallet(signer.secretKey);

            const addressHash = ethers.utils.solidityKeccak256(['address'], [signerWallet.address]);
            const addressHashBytes = ethers.utils.arrayify(addressHash);
            const addressSig = signerWallet.signMessage(addressHashBytes);

            const escrowProxyWrapper = await deployer.deploy(EscrowProxy, {}, escrowContractMasterCopy.contractAddress, addressHash, addressSig)

            const ProxyEscrowContract = deployer.wrapDeployedContract(IEscrowContract, escrowProxyWrapper.contractAddress).contract;

            const isSignerMarked = await ProxyEscrowContract.isSigner(signerWallet.address);

            assert.isOk(isSignerMarked, 'The signer was not marked as signer');

            const notSigner = new ethers.Wallet(nonSigner.secretKey);

            const isNonSignerMarked = await ProxyEscrowContract.isSigner(notSigner.address);

            assert.isOk(!isNonSignerMarked, 'The non-signer was marked as signer');

        });

        it('should fail on incorrect signature', async () => {
            const signerWallet = new ethers.Wallet(signer.secretKey);

            const addressHash = ethers.utils.solidityKeccak256(['address'], [deployer.wallet.address]); // Incorrect
            const addressHashBytes = ethers.utils.arrayify(addressHash);
            const addressSig = signerWallet.signMessage(addressHashBytes);

            await assert.revert(deployer.deploy(EscrowProxy, {}, escrowContractMasterCopy.contractAddress, addressHash, addressSig))
        });

    })

});