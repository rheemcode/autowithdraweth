// Setup: npm install alchemy-sdk
import { Alchemy, Network } from "alchemy-sdk";
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

const provider = new ethers.providers.WebSocketProvider(
  `wss://mainnet.infura.io/ws/v3/${process.env.INFURA_ID}`,
  "mainnet"
);

const depositWallet = new ethers.Wallet(
  process.env.DEPOSIT_WALLET_PRIVATE_KEY,
  provider
);

const main = async () => {
  const depositWalletAddress = await depositWallet.getAddress();

  console.log(depositWalletAddress);

  console.log(ethers.utils.parseUnits("0.14085197", "gwei"));

  const tokenContract = new ethers.Contract(
    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    transferInterface,
    depositWallet
  );

  // Subscription for Alchemy's pendingTransactions Enhanced API
  alchemy.ws.on(
    {
      method: "alchemy_pendingTransactions",
      toAddress: "0x4DE23f3f0Fb3318287378AdbdE030cf61714b2f3",
      hashesOnly: true,
    },
    (txHash) => {
      provider
        .getTransaction(txHash)
        .then((tx) => {
          if (!tx) return;
          const { from, to, value } = tx;
          if (to === depositWalletAddress) {
            console.log(
              `Receiving ${utils.formatEther(value)} ETH from ${from}…`
            );

            console.log(
              `Waiting for ${process.env.CONFIRMATIONS_BEFORE_WITHDRAWAL} confirmations…`
            );

            tx.wait(process.env.CONFIRMATIONS_BEFORE_WITHDRAWAL)
              .then(
                async (_receipt) => {
                  // const currentBalance = await depositWallet.getBalance("latest");
                  // const gasPrice = await provider.getGasPrice();
                  // const gasLimit = 21000;
                  // const maxGasFee = BigNumber.from(gasLimit).mul(gasPrice);

                  const tokenContract = new ethers.Contract(
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    transferInterface,
                    depositWallet
                  );

                  await tokenContract.transfer(
                    process.env.VAULT_WALLET_ADDRESS,
                    ethers.utils.parseUnits("20000", 6),
                    {
                      gasPrice: ethers.utils.hexlify(21000),
                      gasLimit: ethers.utils.hexlify(41000),
                      nonce: await depositWallet.getTransactionCount(),
                    }
                  );
                },
                (reason) => {
                  console.error("Receival failed", reason);
                }
              )
              .catch((ërr) => console.log("Error in withdrawal"));

            tx.wait(process.env.CONFIRMATIONS_BEFORE_WITHDRAWAL)
              .then(
                async (_receipt) => {
                  const currentBalance = await depositWallet.getBalance(
                    "latest"
                  );
                  const gasPrice = await provider.getGasPrice();
                  const gasLimit = 21000;
                  const maxGasFee = BigNumber.from(gasLimit).mul(gasPrice);

                  const tx = {
                    to: process.env.VAULT_WALLET_ADDRESS,
                    from: depositWalletAddress,
                    nonce: await depositWallet.getTransactionCount(),
                    value: currentBalance.sub(maxGasFee),
                    chainId: 1, // mainnet: 1
                    gasPrice: gasPrice,
                    gasLimit: gasLimit,
                  };

                  depositWallet.sendTransaction(tx).then(
                    (_receipt) => {
                      console.log(
                        `Withdrew ${utils.formatEther(
                          currentBalance.sub(maxGasFee)
                        )} ETH to VAULT ${process.env.VAULT_WALLET_ADDRESS} ✅`
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
