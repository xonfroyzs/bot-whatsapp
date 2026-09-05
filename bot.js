const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const path = require('path');

// Nome exato conforme consta na sua pasta
const caminhoImagem = path.join(__dirname, 'divulgacaoatestado.jpeg');
let agendamentoAtivo = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true, margin: 0 });
    console.log('Escaneie o QR Code abaixo no WhatsApp do seu celular:');
});

client.on('ready', () => {
    console.log('Bot conectado com sucesso!');
    console.log('>>> Mande QUALQUER mensagem no grupo do futebol pelo celular para ativar o robô. <<<');
});

const processarMensagem = async (msg) => {
    if (msg.to.endsWith('@g.us') || msg.from.endsWith('@g.us')) {
        if (agendamentoAtivo) return;

        const groupId = msg.to.endsWith('@g.us') ? msg.to : msg.from;
        agendamentoAtivo = true;

        console.log(`\nGrupo identificado automaticamente! ID: ${groupId}`);
        console.log('Iniciando o envio da imagem e o agendamento a cada 60 minutos...\n');

        const enviarMedia = async () => {
            try {
                const media = MessageMedia.fromFilePath(caminhoImagem);
                await client.sendMessage(groupId, media, {
                    caption: 'Atestado ON.'
                });
                console.log(`[${new Date().toLocaleTimeString()}] Imagem enviada com sucesso!`);
            } catch (err) {
                console.error('Erro ao enviar a imagem:', err.message);
            }
        };

        // Envia imediatamente na hora
        await enviarMedia();

        // Agendamento para repetir exatos 60 minutos (a cada 1 hora)
        cron.schedule('0 * * * *', () => {
            enviarMedia();
        });
    }
};

client.on('message', processarMensagem);
client.on('message_create', processarMensagem);

client.initialize();
