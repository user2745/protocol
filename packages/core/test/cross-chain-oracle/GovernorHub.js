const hre = require("hardhat");
const { getContract, assertEventEmitted } = hre;
const { didContractThrow } = require("@uma/common");
const { assert } = require("chai");

const GovernorHub = getContract("GovernorHub");
const MessengerMock = getContract("GovernorMessengerMock");

describe("GovernorHub.js", async () => {
  let accounts;
  let owner;
  let rando;

  let governor;
  let messenger;

  before(async function () {
    accounts = await web3.eth.getAccounts();
    [owner, rando] = accounts;
  });

  beforeEach(async function () {
    governor = await GovernorHub.new().send({ from: owner });
    messenger = await MessengerMock.new().send({ from: owner });
  });
  it("setMessenger", async function () {
    // Only owner can call
    assert(await didContractThrow(governor.methods.setMessenger("1", messenger.options.address).send({ from: rando })));

    const tx = await governor.methods.setMessenger(1, messenger.options.address).send({ from: owner });
    await assertEventEmitted(
      tx,
      governor,
      "SetParentMessenger",
      (event) => event.chainId.toString() === "1" && event.parentMessenger === messenger.options.address
    );
  });
  it("relayGovernance", async function () {
    await governor.methods.setMessenger(1, messenger.options.address).send({ from: owner });

    const relayGovernance = governor.methods.relayGovernance("1", rando, "0xdeadbeef");

    // Only owner can call
    assert(await didContractThrow(relayGovernance.send({ from: rando })));

    const tx = await relayGovernance.send({ from: owner });
    await assertEventEmitted(
      tx,
      governor,
      "RelayedGovernanceRequest",
      (event) =>
        event.chainId.toString() === "1" && event.messenger === messenger.options.address && event.data === "0xdeadbeef"
    );

    // Check that external call messenger.sendMessageToChild occurred.
    assert.equal(await messenger.methods.latestData().call(), "0xdeadbeef");
    assert.equal(await messenger.methods.latestTo().call(), rando);
  });
});
