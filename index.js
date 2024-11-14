import { Client, GatewayIntentBits } from 'discord.js';
import fs from 'fs';
import express from 'express'; // express'i import ile yükledik

const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
];

const client = new Client({ intents });

const dataFile = 'game_data.json';
let golSayilari = {};
let asistSayilari = {};
let lineups = {};

// Save data to file
function saveData() {
    const data = {
        gol_sayilari: golSayilari,
        asistSayilari: asistSayilari,
        lineups: lineups,
    };
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// Load data from file
function loadData() {
    if (fs.existsSync(dataFile)) {
        const rawData = fs.readFileSync(dataFile);
        try {
            const data = JSON.parse(rawData);
            golSayilari = data.gol_sayilari || {};
            asistSayilari = data.asistSayilari || {};
            lineups = data.lineups || {};
        } catch (e) {
            console.error('Veri dosyası bozulmuş, sıfırlanıyor...', e);
            resetData();
        }
    } else {
        resetData();
    }
}

// Reset data
function resetData() {
    golSayilari = {};
    asistSayilari = {};
    lineups = {};
    saveData();
}

// On bot ready
client.once('ready', () => {
    loadData();
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
});

// Handle incoming messages
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (!message.content.startsWith('!')) return;

    const hakemRolId = '1304944555111612506';
    if (!message.member.roles.cache.has(hakemRolId)) {
        return message.reply('Bu komutu kullanmak için @hakem rolüne sahip olmanız gerekiyor!');
    }

    try {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        let golMesaji = '';
        let asistMesaji = '';
        let golResmi = '';
        let asistResmi = '';
        let varResmi = 'https://cdn.wmaraci.com/nedir/VAR.jpg';

        // VAR command: !var
        if (command === 'var') {
            message.reply('Pozisyon "VAR" Ekibimiz Tarafından İncelenmekte...');
            await message.reply(varResmi); 
            return;
        }

        // Goal command: !goal @user
        if (command === 'goal') {
            if (args.length === 0) return message.reply('Lütfen bir kullanıcı belirtin!');
            const user = message.mentions.members.first();
            if (!user) return message.reply('Geçerli bir kullanıcı belirtin!');

            golSayilari[user.id] = (golSayilari[user.id] || 0) + 1;
            saveData();

            golMesaji = `**${user.user.tag}** :soccer: Toplam gol sayısı: **${golSayilari[user.id]}**`;
            golResmi = 'https://cdn.discordapp.com/attachments/1304891541021528146/1305234896591261786/icardii.gif';
        }

        // Assist command: !asist @user
        if (command === 'asist') {
            if (args.length === 0) return message.reply('Lütfen bir kullanıcı belirtin!');
            const user = message.mentions.members.first();
            if (!user) return message.reply('Geçerli bir kullanıcı belirtin!');

            asistSayilari[user.id] = (asistSayilari[user.id] || 0) + 1;
            saveData();

            asistMesaji = `**${user.user.tag}** :champagne_glass: Toplam asist sayısı: **${asistSayilari[user.id]}**`;
            asistResmi = 'https://cdn.discordapp.com/attachments/1174853186230681630/1306314370426339469/untitled.png?ex=67363790&is=6734e610&hm=0008a9823819067c661174e3706f870d62b864d0b4d096078c5d51c5e7db42eb&';
        }

        // Goal removal command: !golal @user amount
        if (command === 'golal') {
            if (args.length < 2) return message.reply('Lütfen bir kullanıcı ve silmek istediğiniz gol sayısını belirtin!');
            const user = message.mentions.members.first();
            const golSilinecekMiktar = parseInt(args[1]);

            if (!user) return message.reply('Geçerli bir kullanıcı belirtin!');
            if (isNaN(golSilinecekMiktar) || golSilinecekMiktar <= 0) return message.reply('Geçerli bir sayı girin!');

            golSayilari[user.id] = Math.max(0, (golSayilari[user.id] || 0) - golSilinecekMiktar);
            saveData();

            golMesaji = `**${user.user.tag}** Golün Alındı Yeni Gol Sayın **${golSayilari[user.id]}**`;
        }

        // Assist removal command: !asistal @user amount
        if (command === 'asistal') {
            if (args.length < 2) return message.reply('Lütfen bir kullanıcı ve silmek istediğiniz asist sayısını belirtin!');
            const user = message.mentions.members.first();
            const asistSilinecekMiktar = parseInt(args[1]);

            if (!user) return message.reply('Geçerli bir kullanıcı belirtin!');
            if (isNaN(asistSilinecekMiktar) || asistSilinecekMiktar <= 0) return message.reply('Geçerli bir sayı girin!');

            asistSayilari[user.id] = Math.max(0, (asistSayilari[user.id] || 0) - asistSilinecekMiktar);
            saveData();

            asistMesaji = `**${user.user.tag}** Asistin Silindi Yeni Asist Sayın: **${asistSayilari[user.id]}**`;
        }

        // Goal King command: !golkralı
        if (command === 'golkralı') {
            if (Object.keys(golSayilari).length === 0) return message.reply('Henüz gol atan oyuncu yok!');

            const sortedGolSayilari = Object.entries(golSayilari)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            let response = '**Gol Kralları:**\n';
            for (const [userId, stat] of sortedGolSayilari) {
                try {
                    const user = await message.guild.members.fetch(userId);
                    response += `${user.user.tag} :soccer: **${stat}** gol\n`;
                } catch (error) {
                    console.error('Kullanıcı fetch hatası:', error);
                }
            }
            message.reply(response);
        }

        // Assist King command: !asistkralı
        if (command === 'asistkralı') {
            if (Object.keys(asistSayilari).length === 0) return message.reply('Henüz asist yapan oyuncu yok!');

            const sortedAsistSayilari = Object.entries(asistSayilari)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            let response = '**Asist Kralları:**\n';
            for (const [userId, stat] of sortedAsistSayilari) {
                try {
                    const user = await message.guild.members.fetch(userId);
                    response += `${user.user.tag} :champagne_glass: **${stat}** asist\n`;
                } catch (error) {
                    console.error('Kullanıcı fetch hatası:', error);
                }
            }
            message.reply(response);
        }

        // Send goal and assist message
        if (golMesaji || asistMesaji) {
            const response = `${golMesaji || ''}\n\n${asistMesaji || ''}`;
            const sentMessage = await message.channel.send(response);
            if (golResmi) await sentMessage.reply(golResmi);
            if (asistResmi) await sentMessage.reply(asistResmi);
        }

        if (command !== 'golkralı' && command !== 'asistkralı' && command !== 'var' ) {
            await message.delete();
        }
    } catch (error) {
        console.error('Hata:', error);
        message.reply('Bir hata oluştu! Lütfen tekrar deneyin.');
    }
});

// Express sunucu
const app = express();
const port = 3000;

// Web sunucu
app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Sunucu ${port} numaralı bağlantı noktasında yürütülüyor.`);
});

client.login(process.env.token);
