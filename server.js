const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('cross-fetch');

const app = express();
app.use(bodyParser.json());

app.post('/customTag', (req, res) => {
    const { action, playerName, tagText } = req.body;
    if (!action || !playerName) return res.status(400).send('Eksik parametre');

    // Burada Roblox/Server koduna bağlanacak fetch veya API çağrısı
    console.log(`[CUSTOM TAG] Action: ${action}, Player: ${playerName}, Tag: ${tagText || ''}`);

    res.send({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server hazır, port ${PORT}`));
