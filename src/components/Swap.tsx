import { useEffect, useState } from "react";
import { Box, Button, MenuItem, Select, TextField } from "@material-ui/core";
import tokensList from "../tokensList.json";
import { ParaSwap } from "paraswap";
import { BigNumber } from "bignumber.js";
import styled from "styled-components";
import utils from "ethers-utils";
import { useWeb3React } from "@web3-react/core";

const StyledTokenInput = styled(Box)`
  display: flex;
  column-gap: 12px;
  margin: 20px 0;
`;

const useTokensList = () => {
  return tokensList.tokens;
};

const useSpotPrice = (
  srcToken: string,
  destToken: string,
  srcAmount: string | undefined
) => {
  const [rate, setRate] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchRate = async () => {
      if (!srcAmount) return;

      const paraSwap = new ParaSwap(137);
      const priceRoute = await paraSwap.getRate(
        srcToken,
        destToken,
        new BigNumber(srcAmount).multipliedBy(10 ** 18).toString()
      );

      if ("message" in priceRoute) return;
      const marketRate = new BigNumber(priceRoute.destAmount).div(
        priceRoute.srcAmount
      );

      setRate(marketRate.toFixed(5));
    };

    fetchRate();
  }, [srcToken, destToken, srcAmount, setRate]);

  return rate;
};

const useSwap = (
  srcToken: string,
  destToken: string,
  _srcAmount: string | undefined
) => {
  const { account, library } = useWeb3React();

  return async () => {
    if (!_srcAmount || !account) return;

    const paraSwap = new ParaSwap(137);
    const srcAmount = new BigNumber(_srcAmount)
      .multipliedBy(10 ** 18)
      .toString();

    const priceRoute = await paraSwap.getRate(srcToken, destToken, srcAmount);

    if ("message" in priceRoute) return alert(priceRoute.message);

    const { destAmount } = priceRoute;

    // Minimum amount of outTOken which the users wants to receive back

    if (srcToken !== "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE")
      await paraSwap.approveToken(srcAmount, account, destToken);

    const _txParams = await paraSwap.buildTx(
      srcToken,
      destToken,
      srcAmount,
      destAmount,
      priceRoute,
      account
    );

    if ("message" in _txParams) return alert(_txParams.message);

    const txParams = {
      gasLimit: utils.hexlify(+_txParams.gas),
      value: utils.hexlify(+_txParams.value),
      data: _txParams.data,
      from: _txParams.from,
      to: _txParams.to,
      chainId: utils.hexlify(+_txParams.chainId),
      gasPrice: utils.hexlify(+_txParams.gasPrice)
    };

    debugger;
    const signer = library.getSigner();

    const txReceipt = await signer.sendTransaction(txParams);

    alert(txReceipt.hash);
  };
};

function TokenInput({
  amount,
  tokenAddress,
  onTokenChange,
  onAmountChange
}: {
  amount: string | undefined;
  tokenAddress: string;
  onTokenChange: (address: string) => void;
  onAmountChange?: (amount: string) => void;
}) {
  const tokensList = useTokensList();

  return (
    <StyledTokenInput>
      <Select
        value={tokenAddress}
        onChange={(event) => onTokenChange(event.target.value as string)}
      >
        {tokensList.map((token) => (
          <MenuItem key={token.address} value={token.address}>
            <img src={token.logoURI} alt={token.name} height={40} width={40} />
          </MenuItem>
        ))}
      </Select>
      <TextField
        value={amount}
        onChange={
          onAmountChange && ((evt) => onAmountChange?.(evt.target.value))
        }
        style={{ width: "84%" }}
        variant="outlined"
      />
    </StyledTokenInput>
  );
}

export default function LimitOrder() {
  const { account } = useWeb3React();

  const [amount, setAmount] = useState<string>("1");

  const [srcTokenAddress, setSrcTokenAddress] = useState<string>(
    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
  );

  const [destTokenAddress, setDestTokenAddress] = useState<string>(
    "0x2a93172c8DCCbfBC60a39d56183B7279a2F647b4"
  );

  const spotRate = useSpotPrice(srcTokenAddress, destTokenAddress, amount);

  const minReturn =
    !amount || !spotRate ? undefined : String(+amount * +spotRate);

  const onSwap = useSwap(srcTokenAddress, destTokenAddress, amount);

  return (
    <Box width={400} justifyContent="center">
      <TokenInput
        amount={amount}
        onAmountChange={setAmount}
        tokenAddress={srcTokenAddress}
        onTokenChange={setSrcTokenAddress}
      />
      <TokenInput
        amount={minReturn}
        tokenAddress={destTokenAddress}
        onTokenChange={setDestTokenAddress}
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={onSwap}
        disabled={!account}
      >
        Swap
      </Button>
    </Box>
  );
}
