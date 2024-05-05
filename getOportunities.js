const axios = require('axios');
const request = require('request');
const { RestClientV5 } = require('bybit-api');

// Módulo para KuCoin
async function getKuCoinOrderBook(symbol, depth) {
    const url = `https://api.kucoin.com/api/v1/market/orderbook/level2_${depth}`;
    try {
        const response = await axios.get(url, { params: { symbol } });
        const asks = response.data.data.asks.map(a => ([parseFloat(a[0]), parseFloat(a[1])]));
        const bids = response.data.data.bids.map(b => ([parseFloat(b[0]), parseFloat(b[1])]));
        return { asks, bids };
    } catch (error) {
                return null;
console.error(`Error fetching KuCoin order book for ${symbol}: ${error.message}`);
    }
}

// Módulo para Kraken
async function getKrakenOrderbook(currencyPair) {
    try {
        const response = await axios.get(`https://api.kraken.com/0/public/Depth?pair=${currencyPair}`);
        if (response.data.error && response.data.error.length > 0) {
            throw new Error(response.data.error.join(', '));
        }
        const resultKey = Object.keys(response.data.result)[0];
        const asks = response.data.result[resultKey].asks.map(a => ([parseFloat(a[0]), parseFloat(a[1])]));
        const bids = response.data.result[resultKey].bids.map(b => ([parseFloat(b[0]), parseFloat(b[1])]));
        return { asks, bids };
    } catch (error) {
                return null;
console.error(`Error fetching Kraken order book for ${currencyPair}: ${error.message}`);
    }
}

// Módulo para Bybit
async function getBybitOrderbook(symbol) {
    const client = new RestClientV5({ testnet: true });
    try {
        const response = await client.getOrderbook({ category: 'linear', symbol: symbol });
        const asks = response.result.a.map(a => ([parseFloat(a[0]), parseFloat(a[1])]));
        const bids = response.result.b.map(b => ([parseFloat(b[0]), parseFloat(b[1])]));
        return { asks, bids };
    } catch (error) {
        return null;
            console.error(`Error fetching Bybit order book for ${symbol}: ${error.message}`);
}
}

// Módulo para Bibox
async function getBiboxOrderBook(symbol) {
    const url = `https://api.bibox.com/api/v4/marketdata/order_book?symbol=${symbol}`;
    try {
        const response = await axios.get(url);
        const data = JSON.parse(response.data);
        const asks = data.result.asks.map(a => ([parseFloat(a.price), parseFloat(a.volume)]));
        const bids = data.result.bids.map(b => ([parseFloat(b.price), parseFloat(b.volume)]));
        return { asks, bids };
    } catch (error) {
        return null;
        console.error(`Error fetching Bibox order book for ${symbol}: ${error.message}`);
        //return null;
    }
}

// Função de Arbitragem Genérica
function checkArbitrageOpportunity(currency, exchanges) {
    const profits = [];
    for (let i = 0; i < exchanges.length; i++) {
        for (let j = i + 1; j < exchanges.length; j++) {
            const ex1 = exchanges[i];
            const ex2 = exchanges[j];
            if (ex1.data && ex2.data) {
                const buyPrice = ex1.data.asks[0][0];
                const sellPrice = ex2.data.bids[0][0];
                const profit = ((sellPrice - buyPrice) / buyPrice) * 100;
                if (profit > 0.05) {
                    profits.push(`Arbitrage opportunity: Buy ${currency} at ${ex1.name} for ${buyPrice}, sell at ${ex2.name} for ${sellPrice}. Profit: ${profit.toFixed(2)}%.`);
                }
            }
        }
    }
    if (profits.length > 0) {
        profits.forEach(p => console.log(p));
    } else {
return null;
        console.log(`No significant arbitrage opportunities found for ${currency}.`);
    }
}

// Execução do script
async function runCheck(currency) {
    //console.log(`Checking for arbitrage opportunities for ${currency}...`);

    const krakenPair = currency === 'BTC' ? 'XXBTZUSD' : `${currency}USD`;
    const bybitSymbol = `${currency}USDT`;
    const kuCoinSymbol = `${currency}-USDT`;
    const biboxSymbol = `${currency}_USDT`;

    const [kraken, bybit, kuCoin, bibox] = await Promise.all([
        getKrakenOrderbook(krakenPair),
        getBybitOrderbook(bybitSymbol),
        getKuCoinOrderBook(kuCoinSymbol, 20),
        getBiboxOrderBook(biboxSymbol)
    ]);

    checkArbitrageOpportunity(currency, [
        { name: 'Kraken', data: kraken },
        { name: 'Bybit', data: bybit },
        { name: 'KuCoin', data: kuCoin },
        { name: 'Bibox', data: bibox }
    ]);
}

const currencies = process.argv.slice(2);
if (currencies.length === 0) {
    console.log('Please specify one or more currency symbols, e.g., node getOrders.js BTC ETH LTC');
    process.exit(1);
}

currencies.forEach(currency => {
    runCheck(currency);
});
setInterval(() => {
    currencies.forEach(currency => {
        runCheck(currency);
    });
}, 30000);
