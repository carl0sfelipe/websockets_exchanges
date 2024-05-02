// Importando módulos necessários
const WebSocket = require('ws');
const { MongoClient } = require('mongodb');

// URL do WebSocket do Kraken e URL de conexão do MongoDB
const wsUrl = 'wss://ws.kraken.com/v2';
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'arbitragem';

// Conectando ao MongoDB
const client = new MongoClient(mongoUrl);

async function connectMongoDB() {
    try {
        await client.connect();
        console.log('Conectado ao MongoDB');
        // A conexão permanecerá aberta durante a execução
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
    }
}

// Função modificada para atualizar ou inserir dados na coleção 'kraken'
// Função para atualizar ou inserir dados na coleção 'kraken' com lógica específica para snapshot e update
async function upsertKrakenData(symbol, bids, asks, type) {
    try {
        const db = client.db(dbName);
        const collection = db.collection('kraken');

        let updateDoc;

        if (type === 'snapshot') {
            // No snapshot, substituímos todos os dados antigos pelos novos
            updateDoc = { $set: { bids: bids, asks: asks } };
        } else if (type === 'update') {
            // Em update, adicionamos ou atualizamos as entradas específicas
            updateDoc = { 
                $push: {
                    bids: { $each: bids },
                    asks: { $each: asks }
                }
            };
        }

        const filter = { symbol: symbol };
        const options = { upsert: true };
        const result = await collection.updateOne(filter, updateDoc, options);
        console.log('Dados do Kraken atualizados com sucesso:', result);
    } catch (error) {
        console.error('Erro ao atualizar dados no Kraken:', error);
    }
}

// Função para manipular mensagens do WebSocket
function handleKrakenMessage(data) {
    const message = JSON.parse(data);

    if (message.channel === "book" && (message.type === "snapshot" || message.type === "update")) {
        console.log(`${message.type} for`, message.data[0].symbol);
        console.log("Bids:", message.data[0].bids);
        console.log("Asks:", message.data[0].asks);

        // Atualizar ou inserir bids e asks no MongoDB com o tipo específico
        upsertKrakenData(message.data[0].symbol, message.data[0].bids, message.data[0].asks, message.type);
    }
}

// O restante do código permanece o mesmo


// Configurando a conexão WebSocket
function setupWebSocket() {
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
        console.log('Conectado ao WebSocket do Kraken');
        const subscriptionMessage = {
            method: "subscribe",
            params: {
                channel: "book",
                symbol: ["NYM/USD"],
            }
        };
        ws.send(JSON.stringify(subscriptionMessage));
    });

    ws.on('message', handleKrakenMessage);
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
    ws.on('close', () => {
        console.log('Conexão WebSocket fechada');
        client.close(); // Fechando a conexão com o MongoDB somente quando o WebSocket fechar
    });
}

// Iniciando o script
async function start() {
    await connectMongoDB();
    setupWebSocket();
}

start();
