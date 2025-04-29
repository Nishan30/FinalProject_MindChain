// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9; // Using the same version as before

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; // Import Strings for uint to string conversion if needed, or handle off-chain

contract HealthDataContract {
    using Counters for Counters.Counter;
    Counters.Counter private _consentIds;
    Counters.Counter private _recordIds;

    // --- Structs (Unchanged) ---
    struct ConsentRecord {
        uint256 id;
        address patientAddress;
        address providerAddress;
        string dataType;
        string purpose;
        uint256 expiryDate; // Store expiry date as timestamp
        bool isActive;
    }

    struct HealthRecord {
        uint256 id;
        address patientAddress;
        string title;
        string description;
        string dataHash; // IPFS hash of the *encrypted record data*
        uint256 dateCreated; // Timestamp
    }

    // --- Mappings (Existing + NEW) ---
    mapping(uint256 => ConsentRecord) public consents; // consentId => ConsentRecord
    mapping(uint256 => HealthRecord) public healthRecords; // recordId => HealthRecord

    // NEW MAPPING: Stores the IPFS hash of the wrapped (encrypted) AES key
    // Links a record ID and a specific provider address to the location of the key needed by that provider for that record.
    // recordId => providerAddress => ipfsHashOfWrappedKey
    mapping(uint256 => mapping(address => string)) private _wrappedKeyIpfsHashes;

    // Optional mapping (Unchanged, can be derived)
    // mapping(address => address[]) public providerPatients;

    // --- Events (Existing + NEW) ---
    event ConsentGranted(uint256 indexed consentId, address indexed patientAddress, address indexed providerAddress, string dataType);
    event ConsentRevoked(uint256 indexed consentId);
    event RecordUploaded(uint256 indexed recordId, address indexed patientAddress, string title, string dataHash);

    // NEW EVENT: Emitted when a patient shares the wrapped key hash for a record with a provider
    event WrappedKeyShared(uint256 indexed recordId, address indexed patientAddress, address indexed providerAddress, string wrappedKeyIpfsHash);


    // --- Modifiers (Unchanged) ---
    modifier onlyPatient(address patientAddress) {
        require(msg.sender == patientAddress, "Only patient can perform this action");
        _;
    }

    modifier onlyProvider(address providerAddress) {
        // Note: This modifier isn't strictly used in the key retrieval path below for simplicity,
        // but could be added to getWrappedKeyHash if desired.
        require(msg.sender == providerAddress, "Only provider can perform this action");
        _;
    }

    modifier consentActive(uint256 consentId) {
        require(consents[consentId].isActive, "Consent is not active");
        require(block.timestamp <= consents[consentId].expiryDate, "Consent has expired");
        _;
    }

    // validConsent modifier remains important for general access checks before attempting decryption
    modifier validConsent(address patientAddress, address providerAddress, string memory dataType) {
        bool foundConsent = false;
        uint256 latestConsentExpiry = 0; // Track expiry if needed for finer logic

        // Loop through consents to find *any* valid one matching the criteria
        for (uint256 i = 1; i <= _consentIds.current(); i++) {
             // Check if consent exists and belongs to the patient first to avoid unnecessary reads
            if (consents[i].patientAddress == patientAddress && consents[i].providerAddress == providerAddress) {
                 ConsentRecord storage consent = consents[i];
                 // Use keccak256 for reliable string comparison
                if (keccak256(bytes(consent.dataType)) == keccak256(bytes(dataType)) &&
                    consent.isActive &&
                    block.timestamp <= consent.expiryDate)
                {
                    foundConsent = true;
                    // Optional: Store latest expiry if needed: latestConsentExpiry = consent.expiryDate;
                    break; // Found a valid consent, no need to check further
                }
            }
        }
        require(foundConsent, "No active consent found for this provider and data type");
        _;
    }


    // --- Consent Functions (Unchanged) ---

    function grantConsent(
        address providerAddress,
        string memory dataType,
        string memory purpose,
        uint256 expiryDateTimestamp
    ) external onlyPatient(msg.sender) returns (uint256) {
        // ... (implementation unchanged) ...
        _consentIds.increment();
        uint256 consentId = _consentIds.current();
        consents[consentId] = ConsentRecord({ id: consentId, patientAddress: msg.sender, providerAddress: providerAddress, dataType: dataType, purpose: purpose, expiryDate: expiryDateTimestamp, isActive: true });
        emit ConsentGranted(consentId, msg.sender, providerAddress, dataType);
        return consentId;
    }

    function revokeConsent(uint256 consentId) external {
        // Ensure consent exists and belongs to caller
        require(consents[consentId].id != 0, "Consent does not exist.");
        require(consents[consentId].patientAddress == msg.sender, "Caller is not the patient who granted this consent.");

        consents[consentId].isActive = false;
        emit ConsentRevoked(consentId);
    }

    function getPatientConsents(address patientAddress) external view returns (ConsentRecord[] memory) {
       // ... (implementation unchanged) ...
        uint256 count = 0;
        for (uint256 i = 1; i <= _consentIds.current(); i++) { if (consents[i].patientAddress == patientAddress) { count++; } }
        ConsentRecord[] memory patientConsents = new ConsentRecord[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _consentIds.current(); i++) { if (consents[i].patientAddress == patientAddress) { patientConsents[index] = consents[i]; index++; } }
        return patientConsents;
    }


    // --- Record Functions (uploadRecord and getPatientRecords Unchanged) ---

    /**
     * @notice Patient uploads metadata for a new encrypted health record.
     * @param title Title of the record.
     * @param description Description of the record.
     * @param dataHash IPFS hash of the *encrypted* record data (IV prepended).
     * @return The ID of the newly created record.
     */
    function uploadRecord(
        string memory title,
        string memory description,
        string memory dataHash // This is the hash of the *encrypted file* on IPFS
    ) external returns (uint256) { // Ensure msg.sender is the patient
        _recordIds.increment();
        uint256 recordId = _recordIds.current();
        healthRecords[recordId] = HealthRecord({
            id: recordId,
            patientAddress: msg.sender, // Record owner is the uploader
            title: title,
            description: description,
            dataHash: dataHash, // Hash of encrypted data
            dateCreated: block.timestamp
        });
        emit RecordUploaded(recordId, msg.sender, title, dataHash);
        return recordId; // Return the ID so patient can use it for sharing keys
    }

    function getPatientRecords(address patientAddress) external view returns (HealthRecord[] memory) {
        // ... (implementation unchanged) ...
        uint256 count = 0;
        for (uint256 i = 1; i <= _recordIds.current(); i++) { if (healthRecords[i].patientAddress == patientAddress) { count++; } }
        HealthRecord[] memory patientRecords = new HealthRecord[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _recordIds.current(); i++) { if (healthRecords[i].patientAddress == patientAddress) { patientRecords[index] = healthRecords[i]; index++; } }
        return patientRecords;
    }

    /**
     * @notice Allows a provider with valid consent to retrieve record metadata (including encrypted data hash).
     * @dev Access control enforced by validConsent modifier.
     */
    function getRecordById(
        uint256 recordId,
        address providerAddress, // Provider attempting access (will be msg.sender typically in FE call)
        string memory dataType   // Data type provider claims consent for (must match a valid consent)
    )
        external
        view
        validConsent(healthRecords[recordId].patientAddress, providerAddress, dataType) // Check general consent first
        returns (HealthRecord memory)
    {
         require(healthRecords[recordId].id != 0, "Record does not exist");
         // No need to check providerAddress against msg.sender here, validConsent handles permission based on input providerAddress
        return healthRecords[recordId];
    }

    function getConsentById(uint256 consentId) external view returns (ConsentRecord memory) {
         require(consents[consentId].id != 0, "Consent does not exist.");
        return consents[consentId];
    }


    // --- NEW Key Sharing Functions ---

    /**
     * @notice Patient calls this to store the IPFS hash of the wrapped encryption key for a specific record and provider.
     * @dev This links the record, provider, and the key needed by that provider.
     * @param recordId The ID of the health record this key relates to.
     * @param providerAddress The address of the provider being granted access via this key.
     * @param wrappedKeyIpfsHash The IPFS hash (CID) where the asymmetrically encrypted (wrapped) symmetric key is stored.
     */
    function shareWrappedKeyHash(
        uint256 recordId,
        address providerAddress,
        string memory wrappedKeyIpfsHash
    ) external {
        // 1. Check if the record exists
        require(healthRecords[recordId].id != 0, "Record does not exist");
        // 2. Check if the caller is the owner (patient) of the record
        require(healthRecords[recordId].patientAddress == msg.sender, "Only the record owner can share the key hash");
        // 3. Basic validation for inputs
        require(providerAddress != address(0), "Provider address cannot be zero");
        require(bytes(wrappedKeyIpfsHash).length > 0, "Wrapped key IPFS hash cannot be empty"); // Very basic check

        // Optional but Recommended: Check if the patient has *some* active consent for this provider?
        // This prevents sharing keys when no active consent relationship exists at all.
        // bool hasSomeConsent = false;
        // for (uint i = 1; i <= _consentIds.current(); i++) {
        //     if (consents[i].patientAddress == msg.sender &&
        //         consents[i].providerAddress == providerAddress &&
        //         consents[i].isActive &&
        //         block.timestamp <= consents[i].expiryDate) {
        //         hasSomeConsent = true;
        //         break;
        //     }
        // }
        // require(hasSomeConsent, "No active consent found for this provider to share key with");

        // 4. Store the hash
        _wrappedKeyIpfsHashes[recordId][providerAddress] = wrappedKeyIpfsHash;

        // 5. Emit the event
        emit WrappedKeyShared(recordId, msg.sender, providerAddress, wrappedKeyIpfsHash);
    }

    /**
     * @notice Retrieves the IPFS hash of the wrapped encryption key for a given record and provider.
     * @dev This hash points to the key needed by the provider to decrypt the specified record.
     * @param recordId The ID of the health record.
     * @param providerAddress The address of the provider whose key hash is being requested.
     * @return The IPFS hash string, or an empty string if not found/shared.
     */
    function getWrappedKeyHash(
        uint256 recordId,
        address providerAddress
    ) external view returns (string memory) {
        // Optional: Add access control? E.g., require msg.sender == providerAddress?
        // Or require validConsent(healthRecords[recordId].patientAddress, providerAddress, dataType)?
        // For simplicity now, allow public read access to the hash. Security relies on the key itself being encrypted.
         require(healthRecords[recordId].id != 0, "Record does not exist"); // Prevent querying non-existent records

        return _wrappedKeyIpfsHashes[recordId][providerAddress];
    }
}