const ethers = require('ethers');
const etherlime = require('etherlime');
const MockToken = require('../build/MockToken.json');
const ECTools = require('../build/ECTools.json');
const EscrowProxy = require('../build/EscrowProxy.json');
const EscrowContract = require('../build/EscrowContract.json');
const IEscrowContract = require('../build/IEscrowContract.json');


const deploy = async (network, secret) => {

	const deployer = new etherlime.EtherlimeGanacheDeployer();
	deployer.defaultOverrides = {
		gasLimit: 4700000
	}
	const ECToolsWrapper = await deployer.deploy(ECTools);
	await deployer.deploy(EscrowContract, {
		ECTools: ECToolsWrapper.contractAddress
	});

};

module.exports = {
	deploy
};