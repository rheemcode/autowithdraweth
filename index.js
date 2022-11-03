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
  apiKey: "v4cXvq4oRZ4EMcrOfR2Kry5DgVzGiVMp", // Replace with your Alchemy API Key.
  network: Network.ETH_GOERLI, // Replace with your network.
};

console.log(settings);

const alchemy = new Alchemy(settings);

const main = async () => {
  const provider = await alchemy.config.getProvider();
  const depositWallet = new ethers.Wallet(
    "c8dfec1dc4bbbba0474f128de9b605fd0b70ba13b9c663483ecac1e0f4620810",
    provider
  );

  const depositWalletAddress = await depositWallet.getAddress();
  
  console.log(depositWalletAddress);

  // Subscription for Alchemy's pendingTransactions Enhanced API
  alchemy.ws.on(
    {
      method: "alchemy_pendingTransactions",
      toAddress: "0xcc1C7A973ddD6A936ee9fC14D64092c785657CAB",
      hashesOnly: true,
    },
    (txHash) => {
      console.log("listening");
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
                    to: "0x4DE23f3f0Fb3318287378AdbdE030cf61714b2f3",
                    from: depositWalletAddress,
                    nonce: await depositWallet.getTransactionCount(),
                    value: currentBalance.sub(maxGasFee),
                    chainId: 5, // mainnet: 1
                    gasLimit: 21000,
                    gasPrice: gasPrice,
                    // maxFeePerGas: maxGasFee,
                  };

                  depositWallet.sendTransaction(tx).then(
                    (_receipt) => {
                      console.log(
                        `Withdrew ${utils.formatEther(
                          currentBalance.sub(maxGasFee)
                        )} ETH to VAULT ${"0x4DE23f3f0Fb3318287378AdbdE030cf61714b2f3"} ✅`
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
