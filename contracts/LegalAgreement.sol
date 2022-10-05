// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LegalAgreement {
    using SafeERC20 for IERC20;

    IERC20 public erc20Token;

    enum AgreementStage {
        SETTLING,
        WAITING,
        COMPLETED
    }
    AgreementStage public stage = AgreementStage.SETTLING;

    address public buyer;
    address public seller;
    uint256 public unlockTimestamp;
    uint256 public depositAmount;

    modifier onlySeller() {
        require(
            msg.sender == seller,
            "Only seller address can call this function."
        );
        _;
    }

    function settleAgreement(
        address _address,
        uint256 _timePeriod,
        uint256 _amount,
        address _tokenAddress
    ) public {
        require(stage == AgreementStage.SETTLING, "Agreement already settled.");
        require(
            _address != address(0) && _address != msg.sender,
            "Invalid seller address."
        );
        require(_timePeriod > 0, "Invalid time period.");
        require(
            _amount > 0,
            "Deposited token amount should be greater than 0."
        );

        buyer = msg.sender;
        seller = _address;
        unlockTimestamp = block.timestamp + _timePeriod;
        erc20Token = IERC20(_tokenAddress);
        depositAmount = _amount;
        stage = AgreementStage.WAITING;

        // deposit token amount at the contract address
        erc20Token.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function withdraw() public onlySeller {
        require(
            block.timestamp >= unlockTimestamp,
            "Withdraw not enabled yet."
        );
        require(
            stage == AgreementStage.WAITING,
            "Withdraw not allowed in this stage"
        );
        stage = AgreementStage.COMPLETED;

        // transfer tokens to the seller and make agreement completed
        erc20Token.safeTransfer(msg.sender, depositAmount);
        depositAmount = 0;
    }
}
