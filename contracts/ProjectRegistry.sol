// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProjectRegistry
/// @notice Stores provenance records (document hashes) for final year project
///         submissions. Documents themselves are NEVER stored on-chain — only
///         the SHA-256 digest, identifiers and a timestamp.
contract ProjectRegistry {
    struct Record {
        bytes32 docHash;
        string projectId;
        string submissionId;
        uint256 timestamp;
        address submitter;
        bool exists;
    }

    address public owner;
    mapping(bytes32 => Record) private records;
    bytes32[] public recordKeys;

    event Anchored(
        bytes32 indexed recordKey,
        bytes32 docHash,
        string projectId,
        string submissionId,
        uint256 timestamp,
        address submitter
    );

    constructor() {
        owner = msg.sender;
    }

    /// @notice Anchor a document hash. A record key can only be written once.
    function anchor(
        bytes32 recordKey,
        bytes32 docHash,
        string calldata projectId,
        string calldata submissionId
    ) external {
        require(!records[recordKey].exists, "record exists");
        require(docHash != bytes32(0), "empty hash");
        records[recordKey] = Record({
            docHash: docHash,
            projectId: projectId,
            submissionId: submissionId,
            timestamp: block.timestamp,
            submitter: msg.sender,
            exists: true
        });
        recordKeys.push(recordKey);
        emit Anchored(recordKey, docHash, projectId, submissionId, block.timestamp, msg.sender);
    }

    /// @notice Read a stored provenance record.
    function getRecord(bytes32 recordKey)
        external
        view
        returns (
            bytes32 docHash,
            string memory projectId,
            string memory submissionId,
            uint256 timestamp,
            address submitter,
            bool exists
        )
    {
        Record storage r = records[recordKey];
        return (r.docHash, r.projectId, r.submissionId, r.timestamp, r.submitter, r.exists);
    }

    /// @notice Verify a document hash against the anchored record.
    function verify(bytes32 recordKey, bytes32 docHash) external view returns (bool) {
        Record storage r = records[recordKey];
        return r.exists && r.docHash == docHash;
    }

    function totalRecords() external view returns (uint256) {
        return recordKeys.length;
    }
}
