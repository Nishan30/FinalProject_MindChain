// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";

contract HealthDataContract {
    using Counters for Counters.Counter;
    Counters.Counter private _consentIds;
    Counters.Counter private _recordIds;

    // --- Structs ---
    struct ConsentRecord {
        uint256 id;
        address patientAddress;   // The patient granting consent
        address providerAddress;  // The provider receiving consent
        uint256 recordId;         // *** ID of the specific record being consented to ***
        string purpose;           // Purpose of the consent
        uint256 expiryDate;       // When this specific consent expires
        bool isActive;            // If this specific consent is active
    }

    struct HealthRecord {
        uint256 id;
        address patientAddress;   // Owner of the record
        string title;
        string description;
        string dataHash;          // IPFS hash of encrypted data
        uint256 dateCreated;
    }

    // --- Mappings ---
    mapping(uint256 => ConsentRecord) public consents; // consentId => ConsentRecord
    mapping(uint256 => HealthRecord) public healthRecords; // recordId => HealthRecord
    mapping(uint256 => mapping(address => string)) private _wrappedKeyIpfsHashes; // recordId => providerAddress => ipfsHashOfWrappedKey

    // --- Events ---
    event ConsentGranted(uint256 indexed consentId, address indexed patientAddress, address indexed providerAddress, uint256 recordId, uint256 expiryDate); // Event includes recordId
    event ConsentRevoked(uint256 indexed consentId); // Applies to a specific record consent
    event RecordUploaded(uint256 indexed recordId, address indexed patientAddress, string title, string dataHash);
    event WrappedKeyShared(uint256 indexed recordId, address indexed patientAddress, address indexed providerAddress, string wrappedKeyIpfsHash);


    // --- Modifiers ---
     modifier recordExists(uint256 recordId) {
        require(healthRecords[recordId].id != 0, "Record: Does not exist");
        _;
    }


    // --- Consent Functions ---

    /**
     * @notice Grants consent for a specific record to a provider.
     * @param providerAddress The provider receiving consent.
     * @param recordId The ID of the specific health record being consented to.
     * @param purpose Description of the consent's purpose.
     * @param expiryDateTimestamp Unix timestamp when this consent expires.
     * @return The ID of the newly created consent.
     */
    function grantConsent(
        address providerAddress,
        uint256 recordId,
        string memory purpose,
        uint256 expiryDateTimestamp
    )
        external
        recordExists(recordId) // Ensure the record exists
        returns (uint256)
    {
        require(providerAddress != address(0), "Consent: Invalid provider address");
        require(expiryDateTimestamp > block.timestamp, "Consent: Expiry must be in the future");
        // Check if caller owns the record they are granting consent for
        require(healthRecords[recordId].patientAddress == msg.sender, "Consent: Caller does not own record");

        _consentIds.increment();
        uint256 consentId = _consentIds.current();
        consents[consentId] = ConsentRecord({
            id: consentId,
            patientAddress: msg.sender, // Patient is the caller
            providerAddress: providerAddress,
            recordId: recordId, // Store the linked record ID
            purpose: purpose,
            expiryDate: expiryDateTimestamp,
            isActive: true
        });
        emit ConsentGranted(consentId, msg.sender, providerAddress, recordId, expiryDateTimestamp);
        return consentId;
    }

    /**
     * @notice Revokes a specific consent (for a single record).
     * @param consentId The ID of the consent to revoke.
     */
    function revokeConsent(uint256 consentId) external {
        ConsentRecord storage consent = consents[consentId];
        require(consent.id != 0, "Consent: Does not exist.");
        // Only the patient who granted it can revoke
        require(consent.patientAddress == msg.sender, "Consent: Caller is not the patient");

        consent.isActive = false;
        emit ConsentRevoked(consentId);
    }

    // --- Access Check Function (Helper - potentially called off-chain/frontend) ---

    /**
     * @notice Checks if a specific provider has active consent for a specific record.
     * @dev Iterates through all consents. Can be gas-intensive if called on-chain frequently. Best used off-chain.
     * @param patientAddress The patient who might have granted consent.
     * @param providerAddress The provider seeking access.
     * @param recordId The specific record access is requested for.
     * @return bool True if an active, non-expired consent exists for this specific record and provider.
     */
    function checkRecordSpecificAccess(
        address patientAddress,
        address providerAddress,
        uint256 recordId
    )
        external
        view
        returns (bool)
    {
        // This loop can become very expensive if a patient has many consents!
         for (uint256 i = 1; i <= _consentIds.current(); i++) {
             // Avoid reading full struct if preliminary checks fail
             if (consents[i].patientAddress == patientAddress &&
                 consents[i].providerAddress == providerAddress &&
                 consents[i].recordId == recordId)
             {
                 // Only read isActive and expiryDate if other fields match
                  if (consents[i].isActive && block.timestamp <= consents[i].expiryDate) {
                     return true; // Found valid consent for this record
                  }
             }
         }
         return false; // No matching active consent found
    }


    // --- Record Functions (Unchanged) ---
    function uploadRecord(
        string memory title, string memory description, string memory dataHash
    ) external returns (uint256) {
        _recordIds.increment();
        uint256 recordId = _recordIds.current();
        healthRecords[recordId] = HealthRecord({ id: recordId, patientAddress: msg.sender, title: title, description: description, dataHash: dataHash, dateCreated: block.timestamp });
        emit RecordUploaded(recordId, msg.sender, title, dataHash);
        return recordId;
    }

    function getPatientRecords(address patientAddress) external view returns (HealthRecord[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= _recordIds.current(); i++) { if (healthRecords[i].patientAddress == patientAddress) { count++; } }
        HealthRecord[] memory patientRecords = new HealthRecord[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _recordIds.current(); i++) { if (healthRecords[i].patientAddress == patientAddress) { patientRecords[index] = healthRecords[i]; index++; } }
        return patientRecords;
    }

    function getRecordById(uint256 recordId) external view recordExists(recordId) returns (HealthRecord memory) {
        return healthRecords[recordId];
    }

    // --- Key Sharing Functions (Unchanged - still needed for decryption) ---
    function shareWrappedKeyHash(
        uint256 recordId, address providerAddress, string memory wrappedKeyIpfsHash
    ) external recordExists(recordId) {
         require(healthRecords[recordId].patientAddress == msg.sender, "KeyShare: Caller is not record owner");
         require(providerAddress != address(0), "KeyShare: Invalid provider address");
         require(bytes(wrappedKeyIpfsHash).length > 0, "KeyShare: Hash cannot be empty");
        _wrappedKeyIpfsHashes[recordId][providerAddress] = wrappedKeyIpfsHash;
        emit WrappedKeyShared(recordId, msg.sender, providerAddress, wrappedKeyIpfsHash);
    }

    function getWrappedKeyHash(
        uint256 recordId, address providerAddress
    ) external view recordExists(recordId) returns (string memory) {
        require(providerAddress == msg.sender, "Access Denied: Caller is not the intended provider");

        // Check if there's actually an active consent for this record/provider pair
        bool hasValidConsent = false;
        for (uint256 i = 1; i <= _consentIds.current(); i++) {
            if (consents[i].patientAddress == healthRecords[recordId].patientAddress && // Check patient owner just in case
                consents[i].providerAddress == providerAddress &&
                consents[i].recordId == recordId &&
                consents[i].isActive &&
                block.timestamp <= consents[i].expiryDate)
            {
                hasValidConsent = true;
                break;
            }
        }
        require(hasValidConsent, "Access Denied: No active consent found for this record/provider");
        return _wrappedKeyIpfsHashes[recordId][providerAddress];
    }

     // --- Other Getters ---
     function getConsentById(uint256 consentId) external view returns (ConsentRecord memory) {
         require(consents[consentId].id != 0, "Consent: Does not exist.");
        return consents[consentId];
    }

    /**
     * @notice Gets all consents granted BY a specific patient.
     * @dev Useful for the patient's dashboard to see all individual grants they've made.
     */
    function getPatientConsents(address patientAddress) external view returns (ConsentRecord[] memory) {
       uint256 count = 0;
        for (uint256 i = 1; i <= _consentIds.current(); i++) { if (consents[i].patientAddress == patientAddress) { count++; } }
        ConsentRecord[] memory patientConsents = new ConsentRecord[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _consentIds.current(); i++) { if (consents[i].patientAddress == patientAddress) { patientConsents[index] = consents[i]; index++; } }
        return patientConsents;
    }

     /**
     * @notice Gets all consents granted TO a specific provider FOR a specific patient.
     * @dev Useful for provider's view to see all individual record consents from one patient.
     */
     function getConsentsForProviderByPatient(address patientAddress, address providerAddress) external view returns (ConsentRecord[] memory) {
       uint256 count = 0;
        for (uint256 i = 1; i <= _consentIds.current(); i++) {
            if (consents[i].patientAddress == patientAddress && consents[i].providerAddress == providerAddress) {
                count++;
            }
        }
        ConsentRecord[] memory providerConsents = new ConsentRecord[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _consentIds.current(); i++) {
             if (consents[i].patientAddress == patientAddress && consents[i].providerAddress == providerAddress) {
                providerConsents[index] = consents[i];
                index++;
             }
        }
        return providerConsents;
    }

}