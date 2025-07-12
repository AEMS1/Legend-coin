(async ()=> {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  let signer, account;
  const routerAddr = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
  const ownerAddr = "0xec54951C7d4619256Ea01C811fFdFa01A9925683";
  const AMS = "0x887ada8fe79740b913De549f81014f37e2f8D07a";

  const routerAbi = [
    "function getAmountsOut(uint,address[]) view returns(uint[])",
    "function swapExactETHForTokens(uint,address[],address,uint)",
    "function swapExactTokensForETH(uint,uint,address[],address,uint)",
    "function swapExactTokensForTokens(uint,uint,address[],address,uint)"
  ];
  const erc20 = ["function approve(address,uint)","function decimals() view returns(uint8)","function transfer(address,uint)"];

  const connect = document.getElementById("connect");
  const fromSel = document.getElementById("fromToken"), toSel = document.getElementById("toToken");
  const fromAmt = document.getElementById("fromAmount"), toAmt = document.getElementById("toAmount");
  const status = document.getElementById("status"), priceUSD = document.getElementById("priceUSD");
  const swapBtn = document.getElementById("swap");

  function populate(){
    tokenList.forEach(t=>{
      fromSel.add(new Option(t.symbol, t.address));
      toSel.add(new Option(t.symbol, t.address));
    });
    fromSel.value = tokenList[0].address;
    toSel.value = tokenList[1].address;
  }
  populate();

  connect.onclick = async ()=>{
    await provider.send("eth_requestAccounts",[]);
    signer = provider.getSigner();
    account = await signer.getAddress();
    connect.innerText = account.slice(0,6)+"..."+account.slice(-4);
  };

  async function updateQuote(){
    if(!fromAmt.value||fromAmt.value<=0) return;
    const path = [fromSel.value, toSel.value];
    const amounts = await (new ethers.Contract(routerAddr, routerAbi, provider))
      .getAmountsOut(ethers.utils.parseUnits(fromAmt.value,18), path);
    const out = ethers.utils.formatUnits(amounts[1],18);
    toAmt.value = parseFloat(out).toFixed(6);
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${toSel.value}USDT`);
    const price = await res.json().then(r=>r.price);
    priceUSD.innerText = `≈ $${(price*out).toFixed(2)}`;
  }

  fromAmt.oninput = updateQuote; fromSel.onchange = updateQuote; toSel.onchange = updateQuote;

  swapBtn.onclick = async ()=>{
    if(!signer) return status.innerText = "Connect wallet first!"
    const amt = ethers.utils.parseUnits(fromAmt.value,18);
    const fee = amt.div(100);
    const swapAmt = amt.sub(fee);
    const deadline = Math.floor(Date.now()/1000)+60*9;
    const path = [fromSel.value, toSel.value];
    const rt = new ethers.Contract(routerAddr, routerAbi, signer);
    const tIn = fromSel.value, tOut = toSel.value;

    try {
      if(tIn=="0xBnbBnbBnbBnbBnbBnbBnbBnbBnbBnbBnbBnb"){ // BNB→Token
        await signer.sendTransaction({to:ownerAddr,value:fee});
        await rt.swapExactETHForTokens(0, path, account, deadline,{value:swapAmt});
      } else {
        const tokenC = new ethers.Contract(tIn, erc20, signer);
        await tokenC.approve(routerAddr, swapAmt);
        const tx = await rt.swapExactTokensForTokens(swapAmt,0,path,account,deadline);
        await tx.wait();
        await tokenC.transfer(ownerAddr,fee);
      }
      // gift AMS:
      const amsC = new ethers.Contract(AMS, erc20, signer);
      await amsC.transfer(account, ethers.utils.parseUnits("0.005",18));

      status.innerText = "✅ Swap completed!";
    } catch(e) {
      console.error(e);
      status.innerText = "❌ Swap failed: "+e.message;
    }
  };

})();
