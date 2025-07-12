
const provider = new ethers.BrowserProvider(window.ethereum);
let signer;
let walletAddress = "";
const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap V2
const feeRecipient = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
const feePercent = 0.007;

async function connectWallet() {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    signer = await provider.getSigner();
    walletAddress = accounts[0];
    document.getElementById("walletAddress").innerText = "Connected: " + walletAddress;
}

window.onload = () => {
    const tokenInSel = document.getElementById("tokenIn");
    const tokenOutSel = document.getElementById("tokenOut");
    tokens.forEach(token => {
        tokenInSel.innerHTML += `<option value="${token.address}">${token.symbol}</option>`;
        tokenOutSel.innerHTML += `<option value="${token.address}">${token.symbol}</option>`;
    });
};

async function performSwap() {
    const tokenInAddr = document.getElementById("tokenIn").value;
    const tokenOutAddr = document.getElementById("tokenOut").value;
    const amountIn = document.getElementById("amountIn").value;

    const tokenIn = tokens.find(t => t.address === tokenInAddr);
    const tokenOut = tokens.find(t => t.address === tokenOutAddr);

    const amountInWei = ethers.parseUnits(amountIn, tokenIn.decimals);
    const router = new ethers.Contract(routerAddress, routerAbi, signer);
    const tokenContract = new ethers.Contract(tokenIn.address, erc20Abi, signer);

    await tokenContract.approve(routerAddress, amountInWei);

    const path = [tokenIn.address, tokenOut.address];
    const amountsOut = await router.getAmountsOut(amountInWei, path);
    const amountOutMin = amountsOut[1];
    const fee = amountOutMin * feePercent;
    const finalAmount = amountOutMin - fee;

    const tx = await router.swapExactTokensForTokens(
        amountInWei,
        finalAmount.toString(),
        path,
        walletAddress,
        Math.floor(Date.now() / 1000) + 60 * 5
    );
    await tx.wait();

    const outTokenContract = new ethers.Contract(tokenOut.address, erc20Abi, signer);
    await outTokenContract.transfer(feeRecipient, fee.toString());

    document.getElementById("outputAmount").innerText = `Received: ${ethers.formatUnits(finalAmount.toString(), tokenOut.decimals)} ${tokenOut.symbol}`;
}
