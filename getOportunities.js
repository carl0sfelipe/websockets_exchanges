const axios = require('axios');
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
        console.error(`Error fetching KuCoin order book for ${symbol}: ${error.message}`);
        return null;
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
        console.error(`Error fetching Kraken order book for ${currencyPair}: ${error.message}`);
        return null;
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
        console.error(`Error fetching Bybit order book for ${symbol}: ${error.message}`);
        return null;
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
                const buyPrice = ex1.data.asks[0][0]; // preço de compra no ask mais baixo
                const sellPrice = ex2.data.bids[0][0]; // preço de venda no bid mais alto

                const profit = ((sellPrice - buyPrice) / buyPrice) * 100;
                if (profit > 0) {
                    profits.push(`Arbitrage opportunity: Buy ${currency} at ${ex1.name} for ${buyPrice}, sell at ${ex2.name} for ${sellPrice}. Profit: ${profit.toFixed(2)}%.`);
                }
            }
        }
    }

    if (profits.length > 0) {
        profits.forEach(p => console.log(p));
    } else {
        console.log(`No significant arbitrage opportunities found for ${currency}.`);
    }
}

// Execução do script
async function runCheck(currency) {
    console.log(`Checking for arbitrage opportunities for ${currency}...`);

    const krakenPair = currency === 'BTC' ? 'XXBTZUSD' : `${currency}USD`;
    const bybitSymbol = `${currency}USDT`;
    const kuCoinSymbol = `${currency}-USDT`;

    const [kraken, bybit, kuCoin] = await Promise.all([
        getKrakenOrderbook(krakenPair),
        getBybitOrderbook(bybitSymbol),
        getKuCoinOrderBook(kuCoinSymbol, 20)
    ]);

    checkArbitrageOpportunity(currency, [
        { name: 'Kraken', data: kraken },
        { name: 'Bybit', data: bybit },
        { name: 'KuCoin', data: kuCoin }
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
