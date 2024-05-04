const axios = require('axios');
const { RestClientV5 } = require('bybit-api');

// Função para calcular e mostrar oportunidades de arbitragem
function checkArbitrageOpportunity(currency, krakenAsk, bybitBid) {
    const profit = ((bybitBid - krakenAsk) / krakenAsk) * 100;
    if (profit > 0) {
        console.log(`Encontrada oportunidade de arbitragem entre Kraken e Bybit para ${currency}!`);
        console.log(`Compre ${currency} na Kraken por ${krakenAsk} e venda na Bybit por ${bybitBid} e ganhe ${profit.toFixed(2)}%`);
    } else {
        console.log(`Nenhuma oportunidade de arbitragem significativa encontrada para ${currency}.`);
    }
}

// Função para buscar e exibir o livro de ofertas da Kraken
async function getKrakenOrderbook(currencyPair) {
    try {
        const response = await axios.get(`https://api.kraken.com/0/public/Depth?pair=${currencyPair}`);
        if (response.data.error && response.data.error.length > 0) {
            throw new Error(response.data.error.join(', '));
        }
        const resultKey = Object.keys(response.data.result)[0];
        const asks = response.data.result[resultKey].asks.map(a => ({ price: parseFloat(a[0]), volume: parseFloat(a[1]) }));
        const bids = response.data.result[resultKey].bids.map(b => ({ price: parseFloat(b[0]), volume: parseFloat(b[1]) }));
        return { ask: asks[0].price, bid: bids[0].price };
    } catch (error) {
        console.error('Error fetching Kraken order book:', error.message);
        return null;
    }
}

// Função para buscar e exibir o livro de ofertas da Bybit
async function getBybitOrderbook(symbol) {
    const client = new RestClientV5({ testnet: true });
    try {
        const response = await client.getOrderbook({ category: 'linear', symbol: symbol });
        const asks = response.result.a.map(a => ({ price: parseFloat(a[0]), volume: parseFloat(a[1]) }));
        const bids = response.result.b.map(b => ({ price: parseFloat(b[0]), volume: parseFloat(b[1]) }));
        return { ask: asks[0].price, bid: bids[0].price };
    } catch (error) {
        console.error('Error fetching Bybit order book:', error.message);
        return null;
    }
}

// Executando as verificações e mostrando oportunidades
async function runCheck(currency) {
    console.log(`Procurando ordens com oportunidade de arbitragem para ${currency}...`);

    const krakenPair = currency === 'BTC' ? 'XXBTZUSD' : `${currency}USD`;
    const bybitSymbol = `${currency}USDT`;

    const krakenData = await getKrakenOrderbook(krakenPair);
    const bybitData = await getBybitOrderbook(bybitSymbol);

    if (krakenData && bybitData) {
        checkArbitrageOpportunity(currency, krakenData.ask, bybitData.bid);
    }
}

const currencies = process.argv.slice(2);
if (currencies.length === 0) {
    console.log('Please specify one or more currency symbols, e.g., node getOrders.js BTC ETH LTC');
    process.exit(1);
}

currencies.forEach(currency => {
    runCheck(currency);
});
