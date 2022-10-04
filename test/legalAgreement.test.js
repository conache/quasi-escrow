const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getEvmSnapshot, revertEvm, advanceTime } = require("./utils");

describe("LegalAgreement", () => {
  let escrowToken, legalAgreement;
  let deployer, buyer, seller;

  before(async () => {
    [deployer, buyer, seller] = await ethers.getSigners();

    // deploy the token smart contrat
    const EscrowTokenFactory = await ethers.getContractFactory("EscrowToken");
    escrowToken = await EscrowTokenFactory.deploy("EscrowToken", "EKT");

    // send tokens to the buyer
    await escrowToken.transfer(
      buyer.address,
      // EKT has 18 decimals, like ETH
      ethers.utils.parseEther("1000000") // 1 MILLION,
    );

    // deploy the agreement smart contract
    const LegalAgreementFactory = await ethers.getContractFactory("LegalAgreement");
    legalAgreement = await LegalAgreementFactory.deploy();
  });

  describe("Before settling agreement", async () => {
    it("should have uninitialized state variables before settling the agreement", async () => {
      expect(await legalAgreement.stage()).to.equal(0);
      expect(await legalAgreement.buyer()).to.equal(ethers.constants.AddressZero);
      expect(await legalAgreement.seller()).to.equal(ethers.constants.AddressZero);
      expect(await legalAgreement.unlockTimestamp()).to.equal(0);
      expect(await legalAgreement.depositAmount()).to.equal(0);
    });

    it("should not allow withdrawal before settling an agreement", async () => {
      // this is the expected error message, since the seller address is not set yet
      await expect(legalAgreement.connect(seller).withdraw()).to.be.revertedWith("Only seller address can call this function.");
    });
  });

  describe("Settle agreement", async () => {
    it("should not allow settling agreement with invalid seller address", async () => {
      // seller address is NullAddress
      await expect(
        legalAgreement.connect(buyer).settleAgreement(
          ethers.constants.AddressZero,
          432000, // 5 days in seconds
          ethers.utils.parseEther("500000"), // 500k EKT
          escrowToken.address
        )
      ).to.be.revertedWith("Invalid seller address.");

      // seller address is the same as the buyer address
      await expect(
        legalAgreement.connect(buyer).settleAgreement(
          buyer.address,
          432000, // 5 days in seconds
          ethers.utils.parseEther("500000"), // 500k EKT
          escrowToken.address
        )
      ).to.be.revertedWith("Invalid seller address.");
    });

    it("should not allow settling agreement with an invalid time period", async () => {
      await expect(
        legalAgreement.connect(buyer).settleAgreement(
          seller.address,
          0,
          ethers.utils.parseEther("500000"), // 500k EKT
          escrowToken.address
        )
      ).to.be.revertedWith("Invalid time period.");
    });

    it("should not allow settling agreement with invalid token amount", async () => {
      await expect(legalAgreement.connect(buyer).settleAgreement(seller.address, 432000, 0, escrowToken.address)).to.be.revertedWith(
        "Deposited token amount should be greater than 0."
      );
    });

    it("should fails allow settling agreement with invalid token address", async () => {
      await expect(legalAgreement.connect(buyer).settleAgreement(seller.address, 432000, 1, ethers.constants.AddressZero)).to.be.revertedWith(
        "Address: call to non-contract"
      );

      const InvalidERC20TokenFactory = await ethers.getContractFactory("InvalidERC20Token");
      invalidToken = await InvalidERC20TokenFactory.deploy();

      await expect(legalAgreement.connect(buyer).settleAgreement(seller.address, 432000, 1, invalidToken.address)).to.be.revertedWith(
        "SafeERC20: low-level call failed"
      );
    });

    it("should fail to settle agreement if the amount of ERC20 is not allowed by the buyer", async () => {
      await expect(
        legalAgreement.connect(buyer).settleAgreement(
          seller.address,
          432000, // 5 days in seconds
          ethers.utils.parseEther("500000"), // 500k EKT
          escrowToken.address
        )
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("should successfully settle the payment agreement", async () => {
      const depositAmount = ethers.utils.parseEther("500000"); // 500k EKT
      const initialBuyerBalance = await escrowToken.balanceOf(buyer.address);

      await escrowToken.connect(buyer).approve(legalAgreement.address, depositAmount);
      const tx = await legalAgreement.connect(buyer).settleAgreement(
        seller.address,
        432000, // 5 days in seconds
        depositAmount,
        escrowToken.address
      );
      const blockTimestamp = (await ethers.provider.getBlock(tx.blockNumber)).timestamp;

      // check contract state
      expect(await legalAgreement.stage()).to.equal(1);
      expect(await legalAgreement.buyer()).to.equal(buyer.address);
      expect(await legalAgreement.seller()).to.equal(seller.address);
      expect(await legalAgreement.unlockTimestamp()).to.equal(blockTimestamp + 432000);
      expect(await legalAgreement.depositAmount()).to.equal(depositAmount);

      // token was successfully transferred to the escrow contract
      expect(await escrowToken.balanceOf(legalAgreement.address)).to.equal(depositAmount);
      expect(await escrowToken.balanceOf(buyer.address)).to.equal(initialBuyerBalance.sub(depositAmount));
    });

    it("should not allow settling an agreement twice", async () => {
      await expect(
        legalAgreement.connect(buyer).settleAgreement(
          seller.address,
          432000, // 5 days in seconds
          ethers.utils.parseEther("500000"),
          escrowToken.address
        )
      ).to.be.revertedWith("Agreement already settled.");
    });
  });

  describe("Withdraw tokens", async () => {
    it("should not allow withdrawal before passing the time period", async () => {
      const snapshotID = await getEvmSnapshot();
      await expect(legalAgreement.connect(seller).withdraw()).to.be.revertedWith("Withdraw not enabled yet.");

      await advanceTime(432000 - 10); // 5 days - 10 seconds
      await expect(legalAgreement.connect(seller).withdraw()).to.be.revertedWith("Withdraw not enabled yet.");
      await revertEvm(snapshotID);
    });

    it("should only allow seller address withdraw the tokens", async () => {
      const snapshotID = await getEvmSnapshot();
      await advanceTime(432000); // 5 days
      await expect(legalAgreement.connect(deployer).withdraw()).to.be.revertedWith("Only seller address can call this function.");
      await revertEvm(snapshotID);
    });

    it("seller should successfully withdraw escrowed tokens after the specified time period ended", async () => {
      const depositAmount = await legalAgreement.depositAmount();

      expect(depositAmount).to.be.gt(0);
      expect(await escrowToken.balanceOf(seller.address)).to.equal(0);

      await advanceTime(432000); // 5 days
      await legalAgreement.connect(seller).withdraw();

      // check contract state
      expect(await legalAgreement.depositAmount()).to.equal(0);
      expect(await legalAgreement.stage()).to.equal(2);

      // check seller balance
      expect(await escrowToken.balanceOf(seller.address)).to.equal(depositAmount);
    });

    it("should not allow the seller withdraw multiple times", async () => {
      await expect(legalAgreement.connect(seller).withdraw()).to.be.revertedWith("Withdraw not allowed in this stage");
    });
  });
});
