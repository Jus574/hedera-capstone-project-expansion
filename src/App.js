import "./App.css";
import { useState, useEffect } from "react";
import {
  AccountId,
  PrivateKey,
  Client,
  TopicMessageSubmitTransaction,
  AccountAllowanceApproveTransaction,
  TokenAssociateTransaction,
} from "@hashgraph/sdk";
import { Buffer } from "buffer";
import { Routes, Route, NavLink } from "react-router-dom";
import CreateCar from "./pages/CreateCar";
import GiveScore from "./pages/GiveScore";
import Borrow from "./pages/BorrowCar";
import Return from "./pages/ReturnCar";
import { ethers } from "ethers";
import { MirrorNodeClient } from "../src/mirrorNodeClient";

// Part 1 - import ABI
import MerchantBackend from "./MerchantBackend.json";

function App() {
  const [defaultAccount, setDefaultAccount] = useState("");
  const [score, setScore] = useState(0);
  const [contract, setContract] = useState();

  // Part 2 - define environment variables
  const scAddress = process.env.REACT_APP_SC_ADDRESS;
  const nftAddress = process.env.REACT_APP_NFT_ADDRESS;
  const nftId = AccountId.fromSolidityAddress(nftAddress).toString();
  const ftAddress = process.env.REACT_APP_FT_ADDRESS;
  const ftId = AccountId.fromSolidityAddress(ftAddress).toString();
  const topicId = process.env.REACT_APP_TOPIC_ID;

  const merchantKey = PrivateKey.fromString(process.env.REACT_APP_MERCHANT_PRIVATE_KEY);
  const merchantId = AccountId.fromString(process.env.REACT_APP_MERCHANT_ID);
  const merchantAddress = process.env.REACT_APP_MERCHANT_ADDRESS;

  const customerAccount = AccountId.fromString(process.env.REACT_APP_CUSTOMER_ACCOUNT_ID);
  
  // Part 3 - create client instance
  const client = Client.forTestnet().setOperator(merchantId, merchantKey);

  const connect = async () => {
    if (window.ethereum) {
      // Part 4 - connect wallet
      const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      signer.getAddress().then(setDefaultAccount);
      window.ethereum.on("accountsChanged", changeConnectedAccount);

      const contractInstance = new ethers.Contract(scAddress, MerchantBackend.abi, signer);
      setContract(contractInstance);
    }
  };

  const changeConnectedAccount = async (newAddress) => {
    try {
      newAddress = Array.isArray(newAddress) ? newAddress[0] : newAddress;
      setDefaultAccount(newAddress);
    } catch (err) {
      console.error(err);
    }
  };

  const getContract = async () => {
    // Part 5 - create contract instance
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    const signer = provider.getSigner();
    signer.getAddress().then(setDefaultAccount);
    const contractInstance = new ethers.Contract(scAddress, MerchantBackend.abi, signer);
    setContract(contractInstance);
  };

  const getScore = async () => {
    try {
      if (defaultAccount) {
        // Part 16 - get reputation token score
        // You can fetch the score here based on the defaultAccount
        // and set it using setScore
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    connect();
    getScore();
  }, [defaultAccount]);

  const createCar = async (cid, price) => {
    try {
      if (!contract) getContract();
      // Part 6 - add new car
      const tx = await contract.createNFT("Car Name", "CAR", price); // You can pass the desired name and symbol here
      await tx.wait();

      // Part 7 - submit add new car logs to topic
      new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(
          `{
            type: Minting,
            accountAddr: ${defaultAccount},
            tokenId: ${nftId}
          }`
        )
        .execute(client);

      alert("Successfully added new car!");
    } catch (e) {
      alert("Failed to add new car");
      console.log(e);
    }
  };

  // Add the functions for associateToken, isAssociated, borrowCar, returnCar, and giveScore here
  
  const isMerchant = defaultAccount.toLowerCase() === merchantAddress.toLowerCase();

  return (
    <>
      <nav>
        <ul className="nav">
          {isMerchant ? (
            <>
              <NavLink to="/" className="nav-item">
                Add Car
              </NavLink>
              <NavLink to="/give" className="nav-item">
                Give Score
              </NavLink>
            </>
          ) : defaultAccount ? (
            <>
              <NavLink to="/" className="nav-item">
                Borrow Car
              </NavLink>
              <NavLink to="/give" className="nav-item">
                Return Car
              </NavLink>
            </>
          ) : (
            <></>
          )}
          <div className="acc-container">
            {!isMerchant && defaultAccount && <p className="acc-score">My Reputation Tokens: {defaultAccount ? score : "0"}</p>}
            <div className="connect-btn">
              <button onClick={connect} className="primary-btn">
                {defaultAccount
                  ? `${defaultAccount?.slice(0, 5)}...${defaultAccount?.slice(defaultAccount?.length - 4, defaultAccount?.length)}`
                  : "Not Connected"}
              </button>
            </div>
          </div>
        </ul>
      </nav>

      {!defaultAccount ? <h1 className="center">Connect Your Wallet First</h1> : <></>}

      <Routes>
        {isMerchant ? (
          <>
            <Route path="/" element={<CreateCar createCar={createCar} />} />
            <Route path="/give" element={<GiveScore giveScore={giveScore} />} />
          </>
        ) : defaultAccount ? (
          <>
            <Route path="/" element={<Borrow borrowCar={borrowCar} />} />
            <Route path="/give" element={<Return returnCar={returnCar} address={defaultAccount} />} />
          </>
        ) : (
          <></>
        )}
      </Routes>
    </>
  );
}

export default App;
