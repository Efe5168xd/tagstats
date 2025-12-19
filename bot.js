const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const noblox = require('noblox.js');
const fetch = require('cross-fetch');

// 🔐 CONFIG
const CONFIG = {
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    ROBLOX_COOKIE: process.env.ROBLOX_COOKIE,
    ROBLOX_GROUP_ID: parseInt(process.env.ROBLOX_GROUP_ID, 10),
    UNIVERSE_ID: parseInt(process.env.UNIVERSE_ID, 10),
    PLACE_ID: parseInt(process.env.PLACE_ID, 10),
    YETKILI_ROL_ID: process.env.YETKILI_ROL_ID,
    PREFIX: '!'
};

// 🚨 Kontroller
if (!CONFIG.DISCORD_TOKEN || !CONFIG.ROBLOX_COOKIE) throw new Error('DISCORD_TOKEN veya ROBLOX_COOKIE eksik!');
if (!CONFIG.PLACE_ID || isNaN(CONFIG.PLACE_ID)) throw new Error('PLACE_ID eksik veya geçersiz.');
if (!CONFIG.YETKILI_ROL_ID) throw new Error('YETKILI_ROL_ID eksik.');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let groupRoles = [];

client.once('ready', async () => {
    console.log(`✅ Bot aktif: ${client.user.tag}`);
    try {
        await noblox.setCookie(CONFIG.ROBLOX_COOKIE);
        const me = await noblox.getAuthenticatedUser();
        console.log(`✅ Roblox: ${me.name}`);
        groupRoles = await noblox.getRoles(CONFIG.ROBLOX_GROUP_ID);
    } catch (err) {
        console.error('❌ Roblox yetkilendirme hatası:', err.message);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content.startsWith(CONFIG.PREFIX)) return;

    const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // =================== !AKTİFLİK ===================
    if (command === 'aktiflik') {
        if (!CONFIG.UNIVERSE_ID || isNaN(CONFIG.UNIVERSE_ID)) {
            return message.reply('❌ UNIVERSE_ID tanımlı değil.');
        }
        try {
            const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${CONFIG.UNIVERSE_ID}`);
            if (!res.ok) throw new Error(`API Hatası: ${res.status}`);
            const data = await res.json();
            const game = data.data?.[0];
            if (!game) throw new Error('Oyun verisi alınamadı.');

            const embed = new EmbedBuilder()
                .setColor('#ff5555')
                .setTitle(`🎮 ${game.name}`)
                .setURL(`https://www.roblox.com/games/${CONFIG.PLACE_ID}`)
                .addFields(
                    { name: '👥 Şu Anda Oynayan', value: `**${game.playing.toLocaleString('tr-TR')}**`, inline: true },
                    { name: '👁️ Toplam Ziyaret', value: game.visits.toLocaleString('tr-TR'), inline: true },
                    { name: '⭐ Favori', value: game.favoritedCount.toLocaleString('tr-TR'), inline: true }
                )
                .setFooter({ text: `Universe ID: ${CONFIG.UNIVERSE_ID}` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (err) {
            console.error('[!aktiflik]', err);
            await message.reply(`❌ Veri alınamadı: \`${err.message}\``);
        }
    }

    // =================== !TAGVER ===================
    if (command === 'tagver') {
        if (!message.member.roles.cache.has(CONFIG.YETKILI_ROL_ID)) return message.reply('❌ Yetkin yok.');
        if (args.length < 2) return message.reply('❌ Kullanım: `!tagver <kullanıcı> <rol>`');

        const username = args.shift();
        const roleName = args.join(' ');

        try {
            const role = groupRoles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
            if (!role) return message.reply('❌ Belirtilen rol grupta bulunamadı.');

            const userId = await noblox.getIdFromUsername(username);
            await noblox.setRank(CONFIG.ROBLOX_GROUP_ID, userId, role.rank);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Rol Verildi')
                .addFields(
                    { name: 'Kullanıcı', value: `[@${username}](https://www.roblox.com/users/${userId}/profile)`, inline: true },
                    { name: 'Rol', value: role.name, inline: true },
                    { name: 'Rank', value: String(role.rank), inline: true }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        } catch (err) {
            console.error('[!tagver]', err);
            await message.reply(`❌ Hata: ${err.message}`);
        }
    }

    // =================== !SERVERS ===================
    if (command === 'servers') {
        try {
            await message.channel.sendTyping();
            const res = await fetch(`https://games.roblox.com/v1/games/${CONFIG.PLACE_ID}/servers/Public?limit=100`);
            if (!res.ok) throw new Error(`Roblox API Hatası ${res.status}`);
            const data = await res.json();
            const servers = data.data || [];

            const active = servers.filter(s => s.playing > 0 && s.maxPlayers > 0).sort((a,b)=>b.playing-a.playing).slice(0,5);
            if (!active.length) return message.reply('❌ Şu anda kimse oynamıyor.');

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🎮 Aktif Sunucular`)
                .setDescription(`Toplam: **${active.reduce((sum,s)=>sum+s.playing,0)}** oyuncu`)
                .setTimestamp();

            const rows = active.map((server,i)=>{
                const num = i+1;
                const full = server.playing>=server.maxPlayers ? ' (Dolu)' : '';
                embed.addFields({ name: `📍 Sunucu ${num}${full}`, value: `👥 ${server.playing}/${server.maxPlayers} • 📶 ${server.ping}ms • 🖥️ ${server.fps} FPS`, inline:false });
                const url = `https://www.roblox.com/games/start?placeId=${CONFIG.PLACE_ID}&gameId=${server.id}`;
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel(`Katıl (Sunucu ${num})`).setStyle(ButtonStyle.Link).setURL(url)
                );
            });

            await message.reply({ embeds: [embed], components: rows });
        } catch (err) {
            console.error('[!servers]', err);
            await message.reply(`❌ Sunucu listesi alınamadı: \`${err.message || 'Bilinmeyen hata'}\``);
        }
    }
});

client.login(CONFIG.DISCORD_TOKEN).catch(err=>console.error('❌ Bot başlatılamadı:',err.message));
