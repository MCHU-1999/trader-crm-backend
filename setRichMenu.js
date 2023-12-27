require('dotenv').config();
var fs = require('fs');
const line = require('@line/bot-sdk');
const { richmenuA, richmenuB } = require('./util/rich-menu');


// create LINE SDK client
const client = new line.Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
});

// (async () => {
//   await client.linkRichMenuToUser('Ud3379a6c7834768c0ecc26a36b7cc675', 'richmenu-014273fd382d2f4a3c951fc3b6588c09');
//   console.log('done');
// })();

// (async () => {
//   await client.deleteRichMenu("richmenu-2de8ba2df5a73c088cfce965ad4ea4c0");
//   await client.deleteRichMenu("richmenu-345ba550b0b0a93ed6c40bea8780b1d6");
//   await client.setDefaultRichMenu("richmenu-dbec34e1c9a8a7a9ba71351933cbeb2d");
//   console.log('done');
// })();


// create RICH menu
client.createRichMenu(richmenuB)
  .then(async (richMenuId) => {
    console.log('richMenuB, Id= ' + richMenuId);
    await client.setRichMenuImage(richMenuId, fs.createReadStream("./images/menu_B.png"));
    console.log('done');
  });
client.createRichMenu(richmenuA)
  .then(async (richMenuId) => {
    console.log('richMenuA, Id= ' + richMenuId);
    await client.setRichMenuImage(richMenuId, fs.createReadStream("./images/menu_A.png"));
    await client.setDefaultRichMenu(richMenuId);
    console.log('done');
  });
