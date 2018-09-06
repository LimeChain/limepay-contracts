pragma solidity ^0.4.24;

contract IEscrowContract {

    event LogActionAuthorised(bytes32 transactionIdHash, address signer);
    event LogFundExecuted(bytes32 transactionIdHash, address recipient, address tokenContract, uint256 tokenFund, uint256 ethFund);

    function getSigner(bytes32 raw, bytes sig) public view returns(address signer);

	function makeSigner(address _signer, bool add) public;

	function isSigner(address _signer) public view returns(bool);

    function fund(bytes32 transactionIdHash, address recipient, address tokenContract, uint256 tokenFund, uint256 ethFund, bytes authorizationSignature) public;

}