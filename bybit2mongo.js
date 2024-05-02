// Importando módulos necessários
const WebSocket = require('ws');
const { MongoClient } = require('mongodb');

// URL do WebSocket da Bybit e URL de conexão do MongoDB
const wsUrl = 'wss://stream.bybit.com/spot/public/v3';
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'arbitragem';

// Conectando ao MongoDB
const client = new MongoClient(mongoUrl);

async function connectMongoDB() {
    try {
        await client.connect();
        console.log('Conectado ao MongoDB');
        const db = client.db(dbName);
        await db.collection('bybit'); // Apenas acessando para garantir que conecta à coleção ou a cria
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
    }
}

// Função modificada para atualizar ou inserir dados na coleção 'orderbook'
// Função modificada para atualizar ou inserir dados na coleção 'orderbook'
async function upsertOrderbookData(data) {
    try {
        const db = client.db(dbName);
        const collection = db.collection('bybit');

        // Utilizando 's' como identificador único e ajustando para 'symbol'
        const filter = { symbol: data.s.replace('USDT', '/USDT') };  // Ajuste para garantir o formato de símbolo correto
        const update = {
            $set: {
                symbol: data.s.replace('USDT', '/USDT'),
                asks: data.asks,
                bids: data.bids
            }
        };
        const options = { upsert: true }; // Importante para realizar o upsert

        await collection.updateOne(filter, update, options);
        console.log('Dados do orderbook atualizados com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar dados no orderbook:', error);
    }
}


// Função para manipular mensagens do WebSocket
function handleOrderbookMessage(data) {
    const message = JSON.parse(data);
    console.log('Received message:', message);
    if (message.type === 'snapshot' || message.type === 'delta') {
        const orderbookData = {
            s: message.data.s,
            asks: message.data.a.map(ask => ({ price: ask[0], qty: ask[1] })),
            bids: message.data.b.map(bid => ({ price: bid[0], qty: bid[1] }))
        };
        console.log('Orderbook Data:', orderbookData);
        upsertOrderbookData(orderbookData);
    }
}


// Configurando a conexão WebSocket
function setupWebSocket() {
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
        console.log('Conectado ao WebSocket da Bybit');
        ws.send(JSON.stringify({
            req_id: "depth00001",
            op: "subscribe",
            args: ["orderbook.40.NYMUSDT"]
        }));
    });

    ws.on('message', handleOrderbookMessage);
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
    ws.on('close', () => {
        console.log('Conexão WebSocket fechada');
    });

    // Enviar um ping a cada 20 segundos para manter a conexão ativa
    setInterval(() => {
        ws.send(JSON.stringify({ req_id: "100001", op: "ping" }));
    }, 20000);
}

// Iniciando o script
async function start() {
    await connectMongoDB();
    setupWebSocket();
}

start();
