const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const path = require('path');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
let qrCodeData = '';

const caminhoImagem = path.join(__dirname, 'divulgacaoatestado.jpeg');
let agendamentoAtivo = false;

app.get('/', (req, res) => {
    if (!qrCodeData) {
        return res.send('<h2>Aguardando QR Code ser gerado... Atualize a página em alguns segundos.</h2>');
    }
    res.send(`
        <html>
            <head><title>WhatsApp Bot QR Code</title></head>
            <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
                <h2>Escaneie o QR Code no WhatsApp</h2>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeData)}" alt="QR Code" />
            </body>
        </html>
    `);
});

app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    qrMaxRetries: 15,
    authTimeoutMs: 300000,
    takeoverOnConflict: true,
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--js-flags="--max-old-space-size=256"',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--mute-audio',
            '--no-default-browser-check',
            '--autoplay-policy=user-gesture-required',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-features=AudioServiceOutOfProcess',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-notifications',
            '--disable-offer-store-unmasked-wallet-cards',
            '--disable-popup-blocking',
            '--disable-print-preview',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-speech-api',
            '--disable-sync',
            '--metrics-recording-only',
            '--no-pings'
        ]
    }
});

client.on('qr', (qr) => {
    qrCodeData = qr;
    qrcode.generate(qr, { small: true });
    console.log('Acesse a URL do Render para ver o QR Code em imagem!');
});

client.on('ready', () => {
    qrCodeData = '';
    console.log('Bot conectado com sucesso!');
    console.log('>>> Mande QUALQUER mensagem no grupo do futebol pelo celular para ativar o robô. <<<');
});

client.on('message_create', async (msg) => {
    if (agendamentoAtivo) return;

    if (msg.fromMe && msg.to.endsWith('@g.us')) {
        const chat = await msg.getChat();
        
        console.log(`\n==============================================`);
        console.log(`GRUPO DETECTADO: "${chat.name}"`);
        console.log(`ID DO GRUPO: ${chat.id._serialized}`);
        console.log(`==============================================\n`);

        agendamentoAtivo = true;
        console.log('Agendamento configurado! O bot enviará a imagem com texto a cada 1 hora.');

        cron.schedule('0 * * * *', async () => {
            try {
                const media = MessageMedia.fromFilePath(caminhoImagem);
                const legenda = `Atestado Médico 📄⚡
Atestado Médico: R$ 40,00

Tudo rápido, sem burocracia e com envio imediato no seu WhatsApp! Chame agora mesmo e garanta o seu`;

                await client.sendMessage(chat.id._serialized, media, { caption: legenda });
                console.log(`[${new Date().toLocaleTimeString()}] Mensagem enviada com sucesso para o grupo ${chat.name}!`);
            } catch (err) {
                console.error('Erro ao enviar mensagem agendada:', err);
            }
        });
    }
});

client.initialize();
