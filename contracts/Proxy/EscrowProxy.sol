pragma solidity ^0.4.21;

import "./SharedStorage.sol";
import "../Implementation/IEscrowContract.sol";

contract EscrowProxy is SharedStorage {


    function () public payable {
        delegatedFwd(masterContract, msg.data);
    }

    /**
     * @dev sets the owner of this escrow proxy to the person that has signed the data
     * 
     * @param _masterContract - address of the master implementation of the Escrow
     * @param signerAddressHash - keccak256 of the address of the signer
     * @param signerAddressSignature - signed signerAddressHash by the signer
     */
    constructor (address _masterContract, bytes32 signerAddressHash, bytes signerAddressSignature) public {
        masterContract = _masterContract;

        address signer = IEscrowContract(masterContract).getSigner(signerAddressHash, signerAddressSignature);
		bytes32 signerHash = keccak256(abi.encodePacked(signer));
		require(signerHash == signerAddressHash);
        _isSigner[signer] = true;
    }
    
    function delegatedFwd(address _dst, bytes _calldata) internal {
        assembly {
            switch extcodesize(_dst) case 0 { revert(0, 0) }

            let result := delegatecall(sub(gas, 10000), _dst, add(_calldata, 0x20), mload(_calldata), 0, 0)
            let size := returndatasize

            let ptr := mload(0x40)
            returndatacopy(ptr, 0, size)

            
            switch result case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }

}