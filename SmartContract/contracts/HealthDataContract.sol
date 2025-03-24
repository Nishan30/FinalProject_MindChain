// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";

contract HealthDataContract {
    using Counters for Counters.Counter;
    Counters.Counter private _consentIds;
    Counters.Counter private _recordIds;

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
        string dataHash; // IPFS hash
        uint256 dateCreated; // Timestamp
    }

    mapping(uint256 => ConsentRecord) public consents;
    mapping(uint256 => HealthRecord) public healthRecords;
    mapping(address => address[]) public providerPatients; // Provider to Patients mapping (optional, can be derived from consents)

    event ConsentGranted(uint256 consentId, address patientAddress, address providerAddress, string dataType);
    event ConsentRevoked(uint256 consentId);
    event RecordUploaded(uint256 recordId, address patientAddress, string title, string dataHash);

    modifier onlyPatient(address patientAddress) {
        require(msg.sender == patientAddress, "Only patient can perform this action");
        _;
    }

    modifier onlyProvider(address providerAddress) {
        require(msg.sender == providerAddress, "Only provider can perform this action");
        _;
    }

    modifier consentActive(uint256 consentId) {
        require(consents[consentId].isActive, "Consent is not active");
        require(block.timestamp <= consents[consentId].expiryDate, "Consent has expired");
        _;
    }

    modifier validConsent(address patientAddress, address providerAddress, string memory dataType) {
        bool foundConsent = false;
        for (uint256 i = 1; i <= _consentIds.current(); i++) {
            ConsentRecord storage consent = consents[i];
            if (consent.patientAddress == patientAddress &&
                consent.providerAddress == providerAddress &&
                keccak256(bytes(consent.dataType)) == keccak256(bytes(dataType)) && // Compare dataType strings
                consent.isActive &&
                block.timestamp <= consent.expiryDate) {
                foundConsent = true;
                break;
            }
        }
        require(foundConsent, "No active consent found for this provider and data type");
        _;
    }

    function grantConsent(
        address providerAddress,
        string memory dataType,
        string memory purpose,
        uint256 expiryDateTimestamp // Expect timestamp in seconds
    ) external onlyPatient(msg.sender) returns (uint256) {
        _consentIds.increment();
        uint256 consentId = _consentIds.current();
        consents[consentId] = ConsentRecord({
            id: consentId,
            patientAddress: msg.sender,
            providerAddress: providerAddress,
            dataType: dataType,
            purpose: purpose,
            expiryDate: expiryDateTimestamp,
            isActive: true
        });
        emit ConsentGranted(consentId, msg.sender, providerAddress, dataType);
        return consentId;
    }

    function revokeConsent(uint256 consentId) external onlyPatient(consents[consentId].patientAddress) {
        require(consents[consentId].patientAddress == msg.sender, "You are not the patient who granted this consent.");
        consents[consentId].isActive = false;
        emit ConsentRevoked(consentId);
    }

    function getPatientConsents(address patientAddress) external view returns (ConsentRecord[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= _consentIds.current(); i++) {
            if (consents[i].patientAddress == patientAddress) {
                count++;
            }
        }
        ConsentRecord[] memory patientConsents = new ConsentRecord[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _consentIds.current(); i++) {
            if (consents[i].patientAddress == patientAddress) {
                patientConsents[index] = consents[i];
                index++;
            }
        }
        return patientConsents;
    }

    // Optional: Function to get patients for a provider (can be derived from consent data if needed)
    // function getProviderPatients(address providerAddress) external view returns (address[] memory) {
    //     return providerPatients[providerAddress];
    // }

    function uploadRecord(
        string memory title,
        string memory description,
        string memory dataHash
    ) external returns (uint256) {
        _recordIds.increment();
        uint256 recordId = _recordIds.current();
        healthRecords[recordId] = HealthRecord({
            id: recordId,
            patientAddress: msg.sender, // Assuming only patient can upload their records
            title: title,
            description: description,
            dataHash: dataHash,
            dateCreated: block.timestamp
        });
        emit RecordUploaded(recordId, msg.sender, title, dataHash);
        return recordId;
    }

    function getPatientRecords(address patientAddress) external view returns (HealthRecord[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= _recordIds.current(); i++) {
            if (healthRecords[i].patientAddress == patientAddress) {
                count++;
            }
        }
        HealthRecord[] memory patientRecords = new HealthRecord[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= _recordIds.current(); i++) {
            if (healthRecords[i].patientAddress == patientAddress) {
                patientRecords[index] = healthRecords[i];
                index++;
            }
        }
        return patientRecords;
    }

    function getRecordById(uint256 recordId, address providerAddress, string memory dataType) external view validConsent(healthRecords[recordId].patientAddress, providerAddress, dataType) returns (HealthRecord memory) {
        return healthRecords[recordId];
    }

    function getConsentById(uint256 consentId) external view returns (ConsentRecord memory) {
        return consents[consentId];
    }
}