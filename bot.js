const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const noblox = require('noblox.js');
const fetch = require('cross-fetch');

// CONFIG from Render Secrets
const CONFIG = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    ROBLOX_COOKIE: process.env.ROBLOX_COOKIE,
    ROBLOX_GROUP_ID: parseInt(process.env.ROBLOX_GROUP_ID, 10),
    UNIVERSE_ID: parseInt(process.env.UNIVERSE_ID, 10),
    PLACE_ID: parseInt(process.env.PLACE_ID, 10),
    YETKILI_ROL_ID: process.env.YETKILI_ROL_ID,
    PREFIX: '!'
};

// Your tag API base
const TAG_API_URL = "https://tagstats.onrender.com";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let groupRoles = [];

client.once('ready', async () => {
    console.log(`Bot hazır: ${client.user.tag}`);

    try {
        await noblox.setCookie(CONFIG.ROBLOX_COOKIE);
        const me = await noblox.getAuthenticatedUser();
        console.log(`Roblox login: ${me.name}`);

        groupRoles = await noblox.getRoles(CONFIG.ROBLOX_GROUP_ID);
    } catch (err) {
        console.error("Roblox yetkilendirme hatası:", err.message);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(CONFIG.PREFIX)) return;

    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // =================== !CTAGVER ===================
    if (command === 'ctagver') {
        if (!message.member.roles.cache.has(CONFIG.YETKILI_ROL_ID)) 
            return message.reply('❌ Yetkin yok.');

        if (args.length < 2) 
            return message.reply('❌ Kullanım: `!ctagver <kullanıcı> <tag>`');

        const username = args.shift();
        const tagText = args.join(' ');

        try {
            // Roblox userId bul
            const userId = await noblox.getIdFromUsername(username);

            // Render API’ye POST
            await fetch(`${TAG_API_URL}/customTag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: "set", playerName: username, tagText })
            });

            return message.reply(`✅ **${username}** tag verildi: **${tagText}**`);
        } catch (err) {
            console.error("[!ctagver]", err);
            return message.reply(`❌ Hata: ${err.message}`);
        }
    }

    // =================== !CTAGKALDIR ===================
    if (command === 'ctagkaldir') {
        if (!message.member.roles.cache.has(CONFIG.YETKILI_ROL_ID)) 
            return message.reply('❌ Yetkin yok.');

        if (args.length < 1) 
            return message.reply('❌ Kullanım: `!ctagkaldir <kullanıcı>`');

        const username = args[0];

        try {
            await fetch(`${TAG_API_URL}/customTag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: "remove", playerName: username })
            });

            return message.reply(`✅ **${username}** tag kaldırıldı.`);
        } catch (err) {
            console.error("[!ctagkaldir]", err);
            return message.reply(`❌ Hata: ${err.message}`);
        }
    }

    // =================== !aktiflik ===================
    if (command === 'aktiflik') {
        if (!CONFIG.UNIVERSE_ID) return message.reply('UNIVERSE_ID tanımlı değil.');

        try {
            const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${CONFIG.UNIVERSE_ID}`);
            const data = await res.json();
            const game = data.data?.[0];
            if (!game) return message.reply('Oyun verisi alınamadı.');

            const embed = new EmbedBuilder()
                .setColor('#ff5555')
                .setTitle(`🎮 ${game.name}`)
                .setURL(`https://www.roblox.com/games/${CONFIG.PLACE_ID}`)
                .addFields(
                    { name: '👥 Şu Anda Oynayan', value: `**${game.playing.toLocaleString('tr-TR')}**`, inline: true },
                    { name: '👁️ Ziyaret', value: game.visits.toLocaleString('tr-TR'), inline: true },
                    { name: '⭐ Favori', value: game.favoritedCount.toLocaleString('tr-TR'), inline: true }
                )
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        } catch (err) {
            console.error("[!aktiflik]", err);
            return message.reply(`❌ Veri alınamadı.`);
        }
    }
});

client.login(CONFIG.DISCORD_TOKEN).catch(err => 
    console.error("Bot başlatılamadı:", err.message)
);
