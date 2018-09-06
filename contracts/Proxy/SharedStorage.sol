pragma solidity ^0.4.21;

contract SharedStorage {
    address public masterContract;

    mapping (address => bool) _isSigner;
    
}
