// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts@4.9.0/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts@4.9.0/access/Ownable.sol";

/**
 * @title AbelianAIAuthenticator
 * @dev A core ERC-721 contract for minting AI Provenance Records to the QDay network.
 * Each token represents a unique, mathematically verified hash of an AI-generated image.
 */
contract AbelianAIAuthenticator is ERC721, Ownable {
    uint256 private _nextTokenId;

    // Mapping from token ID to its metadata hash
    mapping(uint256 => string) private _tokenHashes;

    // Mapping to quickly check if a hash has already been minted to prevent duplicates
    mapping(string => bool) private _hashExists;

    // Events to easily listen to mints and queries from our Next.js frontend
    event ProvenanceMinted(address indexed creator, uint256 indexed tokenId, string imageHash, uint256 timestamp);

    constructor(address initialOwner) ERC721("Abelian AI Provenance", "QAI") Ownable(initialOwner) {}

    /**
     * @dev Mint a new Provenance Record (QNFT).
     * @param to The Abelian wallet address receiving the token.
     * @param imageHash The SHA-256 (or custom) hash of the image file.
     */
    function mintProvenance(address to, string memory imageHash) public {
        require(!_hashExists[imageHash], "Provenance Error: This exact image hash is already registered on QDay.");

        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        
        _tokenHashes[tokenId] = imageHash;
        _hashExists[imageHash] = true;

        emit ProvenanceMinted(to, tokenId, imageHash, block.timestamp);
    }

    /**
     * @dev Check if a hash exists (is verified).
     * @param imageHash The hash to check.
     */
    function isHashRegistered(string memory imageHash) public view returns (bool) {
        return _hashExists[imageHash];
    }

    /**
     * @dev Get the hash associated with a token.
     */
    function getTokenHash(uint256 tokenId) public view returns (string memory) {
        // _requireOwned(tokenId); // OpenZeppelin v5 check
        return _tokenHashes[tokenId];
    }
}
