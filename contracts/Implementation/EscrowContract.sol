pragma solidity ^0.4.24;

import "./IEscrowContract.sol";
import "./ECTools.sol";
import "../Proxy/SharedStorage.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";

contract EscrowContract is IEscrowContract, SharedStorage {

	mapping(bytes32 => bool) private fullfilledTransactions;

	modifier onlyValidSignature(bytes32 transactionIdHash, address recipient, address tokenContract, uint256 tokenFund, uint256 ethFund, bytes authorizationSignature) {
		address signer = getSigner(keccak256(abi.encodePacked(transactionIdHash, recipient, tokenContract, tokenFund, ethFund)), authorizationSignature);
		require(_isSigner[signer], "Invalid authorization signature or signer!");
		emit LogActionAuthorised(transactionIdHash, signer);
		_;
	}

	modifier onlySigner() {
		require(_isSigner[msg.sender], "message sender is not a valid signer!");
		_;
	}

	function() public payable {}

	function getSigner(bytes32 raw, bytes sig) public view returns(address signer) {
		return ECTools.prefixedRecover(raw, sig);
	}

	function isSigner(address _signer) public view returns(bool) {
		return _isSigner[_signer];
	}

	function _sendETHandTokens(address recipient, address tokenContract, uint256 tokenFund, uint256 ethFund) internal {
		require(ERC20Basic(tokenContract).transfer(recipient, tokenFund), "Token transfer did not go through!");
		recipient.transfer(ethFund);
	}

	function _rewardMsgSender() internal {
		// TODO Veselin add your refund logic
	}

	/**
     * @dev Funds a recipient address with given amount of tokens and eth. Can only be executed if correct signature of a signer is passed of all the params. 
     * 
     * @param transactionIdHash - keccak256 hash of the unique identifier of the transaction, given by the LimePay Platform. This needs to be hashed to hide further public info leaks
     * @param recipient - the address of the recipient of this funding
     * @param tokenContract - the ERC20 compatible token contract that we will transfer tokens from
     * @param tokenFund - the amount of tokens to be sent (in the base unit of this token)
     * @param ethFund - the amount of ETH to be funded
     * @param authorizationSignature - bytes signed by an authorized signer wallet of the keccak256 hash of tightly packed transactionIdHash, recipient, tokenContract, tokenFund and ethFund
     */

	function fund(bytes32 transactionIdHash, address recipient, address tokenContract, uint256 tokenFund, uint256 ethFund, bytes authorizationSignature)
	public 
	onlyValidSignature(transactionIdHash, recipient, tokenContract, tokenFund, ethFund, authorizationSignature) {
		require(!fullfilledTransactions[transactionIdHash], "Transaction allready fulfilled!");
		fullfilledTransactions[transactionIdHash] = true;
		_sendETHandTokens(recipient, tokenContract, tokenFund, ethFund);
		_rewardMsgSender();
		// emit LogFundExecuted(transactionIdHash, recipient, tokenContract, tokenFund, ethFund);
	}

	function makeSigner(address _newSigner, bool add) public onlySigner {
		_isSigner[_newSigner] = add;
	}

}
