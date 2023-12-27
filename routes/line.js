require('dotenv').config();
const express = require('express');
const router = express.Router();
const line = require('@line/bot-sdk');
const { getUserRole, getUserData, dailyUpdateUserEquity, createUserData, addWaiting, removeUserData } = require('../util/copyTrade');
const { listeners } = require('process');

const { MongoClient } = require('mongodb');
const mongoURI = process.env.LINE_MONGODB;
const mongoClient = new MongoClient(mongoURI);
console.log('new DB client! (line)');


// CONSTANTS
const ADMIN_GROUP = "Cd7518c98d4369e332f0333d5d4e490df";
const ADMINS = ["Uc17989a2bbda9aef52e89393db74e81f","U76af7a18e05cf5d02f4a0c2d54319c98","U85490f998aca3298f44712caf146de58","Ud6961cf5eecc661a23d775f491996ead"];

// create LINE SDK client
const client = new line.Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
});

router.get('/', (req, res) => res.end(`I'm listening. Please access with POST.`));

router.post('/', (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event) {
  if (event.replyToken && event.replyToken.match(/^(.)\1*$/)) {
    return console.log('Test hook recieved: ' + JSON.stringify(event.message));
  }
  // console.log(`User ID: ${event.source.userId}`);

  switch (event.type) {
    case 'message':
      if (event.source.type === 'group') {
        if (event.message.text === 'get id') {
          return client.replyMessage(event.replyToken, [
            {
              type: 'text',
              text: `您的groupId:\n${event.source.groupId}\n您的userId:\n${event.source.userId}`,
            },
          ]);
        } else {
          return null;
        }
      }else{
        const message = event.message;
        switch (message.type) {
          case 'text':
            return await handleText(message, event.replyToken, event.source);

          case 'sticker':
            return handleSticker(message, event.replyToken);
          default:
            throw new Error(`Unknown message: ${JSON.stringify(message)}`);
        }
      }

    case 'follow':
      return welcomeUser(event.replyToken, event.source);
      // return client.replyMessage(event.replyToken, {
      //   type: 'text',
      //   text: 'Got followed event'
      // });

    case 'unfollow':
      return console.log(`Unfollowed this bot: ${JSON.stringify(event)}`);

    case 'join':
      console.log(`Joined: ${JSON.stringify(event)}`);
      // 加入群組後馬上就他媽的離開
      return client.leaveGroup(event.source.groupId);

    case 'leave':
      return console.log(`Left: ${JSON.stringify(event)}`);

    case 'memberJoined':
      console.log(`MemberJoined: ${JSON.stringify(event)}`);
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `MemberJoined ${event.source.type}`
      });

    case 'memberLeft':
      return console.log(`MemberLeft: ${JSON.stringify(event)}`);

    case 'beacon':
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `Got beacon: ${event.beacon.hwid}`
      });
    
    case 'postback':
      return handlePostback(event.postback, event.replyToken, event.source);

    default:
      throw new Error(`Unknown event: ${JSON.stringify(event)}`);
  }
}

async function handleText(message, replyToken, source) {
  var userData;
  switch (message.text) {
    case 'get id':
      return client.replyMessage(replyToken, [
        {
          type: 'text',
          text: `您的userId:\n${source.userId}`,
        },
      ]);

    case '測試002':
      return client.replyMessage(replyToken,[
        {
          type: 'template',
          altText: 'dev message to open [mycopy]',
          template: {
            type: 'confirm',
            text: '即將開啟測試用LIFF頁面',
            actions: [
              {
                type: 'uri',
                uri: "https://liff.line.me/2000089023-kDOyaaPD/mycopy",
                label: '我的跟單',
              },
              {
                type: 'uri',
                uri: "https://liff.line.me/2000089023-kDOyaaPD/startcopy",
                label: '啟動跟單',
              },
            ],
          },
        }
      ]);

    case '說明文件':
      return client.replyMessage(replyToken, [
        {
          "type": "imagemap",
          "baseUrl": "https://storage.googleapis.com/toriii-crm-images/images/adoumanual",
          "altText": "社群服務說明文件",
          "baseSize": {
            "width": 1040,
            "height": 1040
          },
          "actions": [
            {
              "type": "uri",
              "area": {
                "x": 232,
                "y": 174,
                "width": 576,
                "height": 123
              },
              "linkUri": "https://adou-copytrade.gitbook.io/adou/"
            },
            {
              "type": "uri",
              "area": {
                "x": 234,
                "y": 339,
                "width": 572,
                "height": 174
              },
              "linkUri": "https://adou-copytrade.gitbook.io/adou/services/vip-copytrade"
            },
            {
              "type": "uri",
              "area": {
                "x": 234,
                "y": 513,
                "width": 572,
                "height": 174
              },
              "linkUri": "https://adou-copytrade.gitbook.io/adou/services/vip-indicator"
            },
            {
              "type": "uri",
              "area": {
                "x": 234,
                "y": 690,
                "width": 572,
                "height": 174
              },
              "linkUri": "https://adou-copytrade.gitbook.io/adou/services/manual"
            }
          ]
        }
      ]);


    case '停止跟單':
      client.linkRichMenuToUser(source.userId, 'richmenu-7fac581ae627a07e1bed4c2003ac6b0f');
      client.getProfile(source.userId)
      .then((profile) => {
        client.pushMessage(ADMIN_GROUP, [
          {
            "type": "text",
            "text": `使用者『${profile.displayName}』希望停止跟單，請檢查line後台`
          },
        ]);
      })
      .catch((err) => {
        console.log(`啟動客服按鈕時發生錯誤：\n${err}`);
      });

      return client.replyMessage(replyToken, [
        {
          "type": "text",
          "text": `客服模式已啟動，\n正在聯繫客服人員...`
        },
      ]);

    case '調整跟單':
      client.linkRichMenuToUser(source.userId, 'richmenu-7fac581ae627a07e1bed4c2003ac6b0f');
      client.getProfile(source.userId)
      .then((profile) => {
        client.pushMessage(ADMIN_GROUP, [
          {
            "type": "text",
            "text": `使用者『${profile.displayName}』希望調整跟單，請檢查line後台`
          },
        ]);
      })
      .catch((err) => {
        console.log(`啟動客服按鈕時發生錯誤：\n${err}`);
      });

      return client.replyMessage(replyToken, [
        {
          "type": "text",
          "text": `客服模式已啟動，\n正在聯繫客服人員...`
        },
      ]);

    case '變更方案':
      client.linkRichMenuToUser(source.userId, 'richmenu-7fac581ae627a07e1bed4c2003ac6b0f');
      client.getProfile(source.userId)
      .then((profile) => {
        client.pushMessage(ADMIN_GROUP, [
          {
            "type": "text",
            "text": `使用者『${profile.displayName}』希望變更VIP方案，請檢查line後台`
          },
        ]);
      })
      .catch((err) => {
        console.log(`啟動客服按鈕時發生錯誤：\n${err}`);
      });

      return client.replyMessage(replyToken, [
        {
          "type": "text",
          "text": `客服模式已啟動，\n正在聯繫客服人員...`
        },
      ]);

    case '高倍VIP跟單-資料已建立':

      return client.replyMessage(replyToken, [
        {
          "type": "text",
          "text": `請等待專員將您的OKX帳戶加入跟單名冊，這個動作可能需要一至數個小時，請再次檢查已清空所有倉位，且合約權益高於我們的建議值！\n\n再次感謝您支持阿兜的加密交易社群。`
        },
      ]);

    case 'VIP跟單-資料已建立':

      return client.replyMessage(replyToken, [
        {
          "type": "text",
          "text": `請等待專員將您的OKX帳戶加入跟單名冊，這個動作可能需要一至數個小時，請再次檢查已清空所有倉位，且合約權益高於我們的建議值！\n\n再次感謝您支持阿兜的加密交易社群。`
        },
      ]);

    case 'BTC抄底-資料已建立':

      return client.replyMessage(replyToken, [
        {
          "type": "text",
          "text": `請等待專員將您的OKX帳戶加入跟單名冊，這個動作可能需要一至數個小時，請再次檢查已清空所有倉位，且合約權益高於我們的建議值！\n\n再次感謝您支持阿兜的加密交易社群。`
        },
      ]);

    case '不需續費':
      return client.replyMessage(replyToken,[
        {
          type: 'template',
          altText: '解除VIP身分確認訊息',
          template: {
            type: 'confirm',
            text: '您確定要解除VIP身分嗎？此操作不可復原。',
            actions: [
              {
                type: 'message',
                text: "取消",
                label: '取消',
              },
              {
                type: 'message',
                text: "解除VIP身分",
                label: '確認',
              },
            ],
          },
        }
      ]);

    case '解除VIP身分':
      await removeUserData(mongoClient, source.userId);
      return client.replyMessage(replyToken,[
        {
          "type": "text",
          "text": "已解除VIP身分，感謝您支持阿兜的加密交易社群。",
        }
      ]);

    case 'VIP續費':
      return client.replyMessage(replyToken,[
        {
          type: 'template',
          altText: '提幣確認訊息',
          template: {
            type: 'confirm',
            text: '請確認您已經提幣成功，並於提交截圖後點擊下方確認按紐。',
            actions: [
              {
                type: 'message',
                text: "取消",
                label: '取消',
              },
              {
                type: 'message',
                text: "確認已續費",
                label: '確認',
              },
            ],
          },
        }
      ]);

    case '確認已續費':
      client.getProfile(source.userId)
      .then((profile) => {
        client.pushMessage(ADMIN_GROUP, [
          {
            "type": "text",
            "text": `使用者『${profile.displayName}』已完成VIP續費轉帳，請協助處理。`
          },
        ]);
      })
      return client.replyMessage(replyToken, [
        {
          "type": "text",
          "text": "您已完成續費手續，請等待專員核對帳務，這個動作可能需要一至數個小時，再次感謝您支持阿兜的加密交易社群。",
        }
      ]);

    case '加入申請':
      return client.replyMessage(replyToken,[
        {
          type: 'template',
          altText: '最後一步了！！提幣確認訊息',
          template: {
            type: 'confirm',
            text: '最後一步！\n請確認您已經提幣成功，並於提交截圖後點擊下方確認按紐。',
            actions: [
              {
                type: 'message',
                text: "取消",
                label: '取消',
              },
              {
                type: 'message',
                text: "確認已轉帳",
                label: '確認',
              },
            ],
          },
        }
      ]);

    case '確認已轉帳':
      // client.getProfile(source.userId)
      // .then((profile) => {
      //   client.pushMessage(ADMIN_GROUP, [
      //     {
      //       "type": "text",
      //       "text": `使用者『${profile.displayName}』已申請成為VIP並轉帳，請協助處理。`
      //     },
      //   ]);
      // })
      // .catch((err) => {
      //   console.log(`啟動客服按鈕時發生錯誤：\n${err}`);
      // });
      return client.replyMessage(replyToken, [
        {
          "type": "template",
          "altText": "VIP申請程序已完成",
          "template": {
            "type": "buttons",
            "thumbnailImageUrl": "https://obs.line-scdn.net/0hEbjOCJgPGk1XNghCzqplGmlgR2MsRQNfKk4XIyJlFil8A1kePFBRIiI_RHl-U18SO1ldLCAyQXh7VV8",
            "imageAspectRatio": "rectangle",
            "imageSize": "cover",
            "imageBackgroundColor": "#FFFFFF",
            "title": "申請已完成！",
            "text": "請等待專員核對您的加入申請，這個動作可能需要一至數個小時，再次感謝您支持阿兜的加密交易社群。",
            "actions": [
              {
                type: "uri",
                label: "點我加入VIP群",
                uri: "https://line.me/ti/g2/BWpNGOWb3Gp6W5KgF78ZCcNLcct7wahs1K21FQ?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
              }
            ]
          }
        }
      ]);
      
    case '後台':
      if (ADMINS.includes(source.userId)) {
        return client.replyMessage(replyToken,[
          {
            type: 'template',
            altText: '系統管理員介面',
            template: {
              type: 'confirm',
              text: '即將開啟管理員LIFF頁面',
              actions: [
                {
                  type: 'uri',
                  uri: "https://liff.line.me/2000089023-kDOyaaPD/backstage",
                  label: '後台',
                },
                {
                  type: 'uri',
                  uri: "https://liff.line.me/2000089023-kDOyaaPD/backstage",
                  label: '還是後台',
                },
              ],
            },
          }
        ]);
      } else {
        return 'default';
      }
    default:
      return 'default';
  }
}


function handleSticker(message, replyToken) {
  return client.replyMessage(
    replyToken,
    {
      type: 'sticker',
      packageId: message.packageId,
      stickerId: message.stickerId,
    }
  );
}

async function handlePostback(postback, replyToken, source){
  console.log(`postback: ${postback.data}`);
  switch (postback.data) {
    case 'switch-to-richmenu-a-postback':
      return client.replyMessage(replyToken, [
        {
          "type": "text",
          "text": `客服模式已關閉`
        },
      ]);
    case 'switch-to-richmenu-b-postback':
      client.getProfile(source.userId)
      .then((profile) => {
        client.pushMessage(ADMIN_GROUP, [
          {
            "type": "text",
            "text": `使用者『${profile.displayName}』已啟動客服，請檢查line後台`
          },
        ]);
      })
      .catch((err) => {
        console.log(`啟動客服按鈕時發生錯誤：\n${err}`);
      });

      return client.replyMessage(replyToken, [
        {
          "type": "text",
          "text": `客服模式已啟動，\n正在聯繫客服人員...`
        },
      ]);
    
    default:
      return 'default';
  }
}

async function welcomeUser(replyToken, source) {
  return client.replyMessage(replyToken, [
    {
      "type": "template",
      "altText": "歡迎加入阿兜的加密交易社群！",
      "template": {
        "type": "buttons",
        "thumbnailImageUrl": "https://storage.googleapis.com/toriii-crm-images/images/adou_logo.png",
        "imageAspectRatio": "rectangle",
        "imageSize": "cover",
        "imageBackgroundColor": "#FFFFFF",
        "title": "歡迎加入！",
        "text": "您好！\n歡迎加入阿兜的加密交易社群\n\n此官方帳號目前提供：\n主觀交易跟單\n跟單客戶服務",
        "actions": [
          {
            "type": "message",
            "label": "查看說明文件",
            "text": "說明文件"
          }
        ]
      }
    }
  ]);
}


module.exports = router;