// create RICH menu
// A 是客服沒開的正常模式
exports.richmenuA = {
  "size": {
    "width": 2500,
    "height": 843,
  },
  "selected": true,
  "name": "圖文選單 A",
  "chatBarText": "功能選單",
  "areas": [
    {
      "bounds": {
        "x": 91.2,
        "y": 91.2,
        "width": 1353,
        "height": 280
      },
      "action": {
        "type": "uri",
        "uri": "https://liff.line.me/2000089023-kDOyaaPD/product"
      }
    },
    {
      "bounds": {
        "x": 1504.87,
        "y": 91.2,
        "width": 890,
        "height": 280
      },
      "action": {
        "type":"richmenuswitch",
        "richMenuAliasId":"richmenu-b",
        "data":"switch-to-richmenu-b-postback"
      }
    },
    {
      "bounds": {
        "x": 0,
        "y": 473.70,
        "width": 1353,
        "height": 280
      },
      "action": {
        "type": "message",
        "text": "說明文件"
      }
    },
    {
      "bounds": {
        "x": 1504.87,
        "y": 473.70,
        "width": 890,
        "height": 280
      },
      "action": {
        "type": "uri",
        "uri": "https://liff.line.me/2000089023-kDOyaaPD/mycopy"
      }
    },
  ]
}

// B 是客服開啟的紅色模式
exports.richmenuB = {
  "size": {
    "width": 2500,
    "height": 843,
  },
  "selected": true,
  "name": "圖文選單 B",
  "chatBarText": "功能選單",
  "areas": [
    {
      "bounds": {
        "x": 91.2,
        "y": 91.2,
        "width": 1353,
        "height": 280
      },
      "action": {
        "type": "uri",
        "uri": "https://liff.line.me/2000089023-kDOyaaPD/product"
      }
    },
    {
      "bounds": {
        "x": 1504.87,
        "y": 91.2,
        "width": 890,
        "height": 280
      },
      "action": {
        "type":"richmenuswitch",
        "richMenuAliasId":"richmenu-a",
        "data":"switch-to-richmenu-a-postback"
      }
    },
    {
      "bounds": {
        "x": 0,
        "y": 473.70,
        "width": 1353,
        "height": 280
      },
      "action": {
        "type": "message",
        "text": "說明文件"
      }
    },
    {
      "bounds": {
        "x": 1504.87,
        "y": 473.70,
        "width": 890,
        "height": 280
      },
      "action": {
        "type": "uri",
        "uri": "https://liff.line.me/2000089023-kDOyaaPD/mycopy"
      }
    },
  ]
}