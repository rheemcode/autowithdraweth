// Setup: npm install alchemy-sdk
import { Alchemy, Network, Utils } from "alchemy-sdk";
import ethers, { BigNumber, utils } from "ethers";
import dotenv from "dotenv";

dotenv.config();


const transferInterface = ["function transfer(address to, uint amount)"];

// export const myAddress = "0x58d0479bc1dADF0ce218D862143E268B538E2F62";
const erc20ContractInterface = [
  "function approve(address _spender, uint256 _amount) external returns (bool)",
];

// Optional config object, but defaults to demo api-key and eth-mainnet.
const settings = {
  apiKey: "QmN987r2njqRwi-sayxhDTX0rZariEcY", // Replace with your Alchemy API Key.
  network: Network.ETH_MAINNET, // Replace with your network.
};

const alchemy = new Alchemy(settings);

const main = async () => {
  const provider = await alchemy.config.getProvider();
  const depositWallet = new ethers.Wallet(
    "ee9cec01ff03c0adea731d7c5a84f7b412bfd062b9ff35126520b3eb3d5ff258",
    provider
  );

  const depositWalletAddress = await depositWallet.getAddress();

  // Subscription for Alchemy's pendingTransactions Enhanced API
  alchemy.ws.on(
    {
      method: "alchemy_pendingTransactions",
      toAddress: "0x4DE23f3f0Fb3318287378AdbdE030cf61714b2f3",
      hashesOnly: true,
    },
    (txHash) => {
      alchemy.core
        .getTransaction(txHash)
        .then((tx) => {
          if (!tx) return;
          const { to } = tx;
          if (to === depositWalletAddress) {
            tx.wait(1)
              .then(
                async (_receipt) => {
                  const currentBalance = await depositWallet.getBalance(
                    "latest"
                  );
                  const gasPrice = await alchemy.core.getGasPrice();
                  const gasLimit = 21000;
                  const maxGasFee = BigNumber.from(gasLimit).mul(gasPrice);

                  const tx = {
                    to: "0xcc1C7A973ddD6A936ee9fC14D64092c785657CAB",
                    from: depositWalletAddress,
                    nonce: await depositWallet.getTransactionCount(),
                    value: currentBalance.sub(maxGasFee),
                    chainId: 1, // mainnet: 1
                    gasLimit: 21000,
                    gasPrice: gasPrice,
                    // maxFeePerGas: maxGasFee,
                  };

                  depositWallet.sendTransaction(tx).then(
                    (_receipt) => {
                      console.log(
                        `Withdrew ${utils.formatEther(
                          currentBalance.sub(maxGasFee)
                        )} ETH to VAULT ${"0xcc1C7A973ddD6A936ee9fC14D64092c785657CAB"} ✅`
                      );
                    },
                    (reason) => {
                      console.error("Withdrawal failed", reason);
                    }
                  );
                },
                (reason) => {
                  console.error("Receival failed", reason);
                }
              )
              .catch((err) => {
                console.log("Error in withdrawal");
                console.log(err);
              });
          }
        })
        .catch((err) => {
          console.log(err);
        });
    }
  );
};

main();
