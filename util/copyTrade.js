require('dotenv').config();
const { MongoClient } = require('mongodb');
const { okxApi } = require('../util/tts-okx');
const Srand = require('seeded-rand');
const moment = require('moment-timezone');
moment.tz.setDefault("Asia/Taipei");
const line = require('@line/bot-sdk');
const { decrypt } = require('./crypto');
const { error } = require('console');

const mongoClient = MongoClient;
const DB_NAME = "CustomerAdou";
const USER_COLLECTION = "user";

function dateNow() {
  return moment( Date.now() ).tz("Asia/Taipei").format("YYYY-MM-DD"); 
}

function timeNow() {
  return moment( Date.now() ).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss"); 
}

function round(numToBeRound, digits){
  return Math.round((numToBeRound + Number.EPSILON) * (10 ** digits)) / (10 ** digits);
}


/**
 * get user data (line id, okx uid, okx api...) from user DB
 * @param {String} strategyName
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 */
async function getUserData(strategyName, client, lineUserId) {
  if (lineUserId === undefined) {
    throw new Error('must provide [lineUserId] or [okxUid]!');
    // return false;
  } else {
    const db = client.db(DB_NAME);
    let userDB = db.collection(USER_COLLECTION);
    var result;
    if (strategyName === undefined) {
      result = await userDB.find({ "lineUserId": lineUserId }).toArray();
      // return all strategies
      if (result.length === 0){
        return {};
      } else {
        return result[0];
      }
    } else {
      result = await userDB.find({ "lineUserId": lineUserId, "strategy.strategyName": strategyName }).toArray();
      if (result.length === 0){
        return {};
      } else {
        result = result[0].strategy.filter(element => element.strategyName === strategyName);
        return result[0];
      }
    }
  }
}

/**
 * check if this person is a user or not
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 */
async function getUserRole(client, lineUserId) {
  if(lineUserId === undefined){
    throw new Error('must provide [lineUserId]!');
    // return false;
  }else{
    const db = client.db(DB_NAME);
    let userDB = db.collection(USER_COLLECTION);
    var result;
    result = await userDB.find({ "lineUserId": lineUserId }).toArray();

    if (result.length === 0) {
      return 'not found';
    } else {
      result = result[0];
    }

    if (result.strategy.length === 0){
      return [];
    } else {
      return result.strategy.map(item => item.strategyName);
    }
  }
}

/**
 * monthly message function for charging vip member fees (ADOU user only)
 * @param {mongoClient} client 
 * @param {line.Client} lineClient 
 */
async function checkChargeAdou(client, lineClient) {
  const db = client.db("CustomerAdou");
  let userDB = db.collection("user");
  let allUser = await userDB.find({}).toArray();
  var howhuch = 0;
  var text = "";

  allUser.forEach(element => {
    let now = Number(moment( Date.now() ).tz("Asia/Taipei").format("X"));
    let paydayTS = Number(moment(`${ element.payday } 00:00:00`).tz("Asia/Taipei").format("X"));
    if (now > paydayTS) {
      if (element.vipPlan === '普通方案') {
        howhuch = 200;
        text = `親愛的用戶您好，您所使用的${element.vipPlan}已於${element.payday}到期。\n\n請在${element.due}晚間23:59前提幣 ${howhuch}USDT 至指定地址以完成續費程序，否則管理員將有權停用您的VIP身分及使用中的跟單服務。\n\n若有任何疑問歡迎使用客服系統！`
      } else if (element.vipPlan === '學生方案') {
        howhuch = 150;
        text = `親愛的用戶您好，您所使用的${element.vipPlan}已於${element.payday}到期。\n\n請在${element.due}晚間23:59前提幣 ${howhuch}USDT 至指定地址以完成續費程序，否則管理員將有權停用您的VIP身分及使用中的跟單服務。\n\n若有任何疑問歡迎使用客服系統！`
      }else if (element.vipPlan === '體驗方案') {
        howhuch = 200
        text = `親愛的用戶您好，您所使用的${element.vipPlan}已於${element.payday}到期，預設將您轉為普通方案，如有學生身分請選擇『變更方案』並驗證身分。\n\n請在${element.due}晚間23:59前提幣 ${howhuch}USDT 至指定地址以完成續費程序，否則管理員將有權停用您的VIP身分及使用中的跟單服務。\n\n若有任何疑問歡迎使用客服系統！`
      } else {
        throw new Error('WTF plan?');
      }
      lineClient.pushMessage(element.lineUserId, [
        {
          type: 'text',
          text: text,
        },
        {
          type: 'text',
          text: '指定繳費地址：\nTHV7BfNnEr9E7ncsEkrvvmfJGRjFxqUYW8',
        },
        {
          "type": "template",
          "altText": "VIP申請程序已完成",
          "template": {
            "type": "buttons",
            "thumbnailImageUrl": "https://storage.googleapis.com/toriii-crm-images/images/adoupayday.png",
            "imageAspectRatio": "rectangle",
            "imageSize": "cover",
            "imageBackgroundColor": "#FFFFFF",
            "title": "繳費日又到",
            "text": "請選擇是否續費或變更方案：",
            "actions": [
              {
                type: "message",
                label: "不需續費",
                text: "不需續費"
              },
              {
                type: "message",
                label: "變更方案",
                text: "變更方案"
              },
              {
                type: "message",
                label: "我要續費",
                text: "VIP續費"
              },
            ]
          }
        }
      ]);
      console.log(`${element.lineUserName} PUSHED`);
    } else {
      console.log(`${element.lineUserName} PASS`);
    }
  });
}

/**
 * daily update function for user equity only
 * @param {mongoClient} client 
 */
async function dailyUpdateUserEquity(client) {
  const db = client.db(DB_NAME);
  let userDB = db.collection("user");
  let result = await userDB.find({}).toArray();
  if (result.length === 0){
    throw new Error('empty DB!');
  }else{
    let updateResult = {};
    var dataToUpdate = {};
    for (let eachUser of result) {
      try{
        dataToUpdate = eachUser;
        for (let i=0; i<dataToUpdate.strategy.length; i++) {
          let decryptApi = JSON.parse(decrypt(dataToUpdate.strategy[i].api));
          let okxAccount = new okxApi({
            apiKey: decryptApi.apiKey,
            secret: decryptApi.apiSecret,
            password: decryptApi.passphrase,
          });
          let resData = await okxAccount.fetchEquity();
          // console.log(`okxAccount.fetchEquity() data:\n${resData}`)
          let currentEquity = round(parseFloat(resData.data[0].totalEq), 2);

          dataToUpdate.strategy[i].currentEquity = currentEquity;
          dataToUpdate.strategy[i].historyEquity[`${dateNow()}`] = currentEquity;
          dataToUpdate.strategy[i].updateTime = timeNow();
          dataToUpdate.strategy[i]['roi'] = round((currentEquity - dataToUpdate.strategy[i].initialEquity)*100/dataToUpdate.strategy[i].initialEquity, 2);
          dataToUpdate.strategy[i]['pnl'] = round((currentEquity - dataToUpdate.strategy[i].initialEquity), 2);
        }
        await userDB.updateOne({ "lineUserId": eachUser.lineUserId }, {$set: dataToUpdate}, { upsert: true });
        updateResult[`${dataToUpdate.lineUserId}`] = true;
      }catch(error){
        console.log('error!');
        console.log(error);
        updateResult[`${dataToUpdate.lineUserId}`] = false;
      }
    }
    return updateResult;
  }
}

/**
 * create empty user data (vip confirmed)
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 */
async function createUserData(client, lineUserId) {
  if (lineUserId === undefined) {
    throw new Error('createUserData() must provide [lineUserId]!');
    // return false;
  } else {
    const db = client.db(DB_NAME);
    let userDB = db.collection(USER_COLLECTION);
    let waitingLine = db.collection("waiting");

    dataInQueue = await waitingLine.find({ "lineUserId": lineUserId }).toArray();
    // console.log(dataInQueue);

    if (dataInQueue.length === 1) {
      let dataToRemove = dataInQueue[0];
      let month = dataToRemove.vipPlan === "體驗方案" ? 1 : 3;
      let payday = moment( Date.now() ).tz("Asia/Taipei").add(month, 'month');
      let due = moment( Date.now() ).tz("Asia/Taipei").add(month, 'month').add(3, 'day');
      let dataToUpdate = {
        lineUserId: lineUserId,
        lineUserName: dataToRemove.lineUserName,
        linePFP: dataToRemove.linePFP,
        vipPlan: dataToRemove.vipPlan,
        strategy:[],
        startDate: `${dateNow()}`,
        payday: `${payday.format("YYYY-MM-DD")}`,
        due: `${due.format("YYYY-MM-DD")}`,
      };
      updateResult = await userDB.updateOne({ "lineUserId": lineUserId }, {$set: dataToUpdate}, { upsert: true });
      await waitingLine.deleteOne(dataToRemove);
      return updateResult;
    } else {
      throw new Error('you should have 1 user data in waiting DB!');
    }
  }
}

/**
 * remove user data from vip list
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 */
async function removeUserData(client, lineUserId) {
  if (lineUserId === undefined) {
    throw new Error('removeUserData() must provide [lineUserId]!');
    // return false;
  } else {
    const db = client.db(DB_NAME);
    let userDB = db.collection(USER_COLLECTION);

    let dataToRemove = await userDB.find({ "lineUserId": lineUserId }).toArray();

    if (dataToRemove.length === 1) {
      dataToRemove = dataToRemove[0];
      deleteResult = await userDB.deleteOne(dataToRemove);
      return deleteResult;
    } else {
      throw new Error('you should have 1 user data in user DB!');
    }
  }
}

/**
 * remove user from waiting list
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 */
async function removeWaiting(client, lineUserId) {
  if (lineUserId === undefined) {
    throw new Error('removeUserData() must provide [lineUserId]!');
    // return false;
  } else {
    const db = client.db(DB_NAME);
    let waitingLine = db.collection("waiting");

    let dataToRemove = await waitingLine.find({ "lineUserId": lineUserId }).toArray();

    if (dataToRemove.length === 1) {
      dataToRemove = dataToRemove[0];
      deleteResult = await waitingLine.deleteOne(dataToRemove);
      return deleteResult;
    } else {
      throw new Error('you should have 1 user data in waiting DB!');
    }
  }
}

/**
 * update payday & due
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 */
async function updatePayday(client, lineUserId) {
  if (lineUserId === undefined) {
    throw new Error('updatePayday() must provide [lineUserId]!');
    // return false;
  } else {
    const db = client.db(DB_NAME);
    let userDB = db.collection(USER_COLLECTION);

    let dataToUpdate = await userDB.find({ "lineUserId": lineUserId }).toArray();

    if (dataToUpdate.length === 1) {
      dataToUpdate = dataToUpdate[0];
      let payday = moment( dataToUpdate.payday ).tz("Asia/Taipei").add(3, 'month').format("YYYY-MM-DD");
      let due = moment( dataToUpdate.due ).tz("Asia/Taipei").add(3, 'month').format("YYYY-MM-DD");
      dataToUpdate["payday"] = payday;
      dataToUpdate["due"] = due;
      if (dataToUpdate.vipPlan === '體驗方案') {
        dataToUpdate["vipPlan"] = '普通方案';
      }

      updateResult = await userDB.updateOne({ "lineUserId": lineUserId }, {$set: dataToUpdate}, { upsert: true });
      return updateResult;
    } else {
      throw new Error('you should have 1 user data in user DB!');
    }
  }
}

/**
 * remove user data from vip list
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 * @param {String} vipPlan 
 * @param {String} payday
 * @param {String} due 
 */
async function updatePlan(client, lineUserId, vipPlan, payday, due) {
  if (lineUserId === undefined || vipPlan === undefined) {
    throw new Error('updatePayday() must provide [lineUserId]!');
  } else {
    const db = client.db(DB_NAME);
    let userDB = db.collection(USER_COLLECTION);
    let dataToUpdate = await userDB.find({ "lineUserId": lineUserId }).toArray();

    if (dataToUpdate.length === 1) {
      // copy
      dataToUpdate = dataToUpdate[0];
      // update
      dataToUpdate["vipPlan"] = vipPlan;
      dataToUpdate["payday"] = payday;
      dataToUpdate["due"] = due;
      // update db
      updateResult = await userDB.updateOne({ "lineUserId": lineUserId }, {$set: dataToUpdate}, { upsert: true });
      return updateResult;
    } else {
      throw new Error('you should have 1 user data in user DB!');
    }
  }
}

/**
 * add new strategy to user 
 * @param {String} strategyName
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 * @param {String} okxUid 
 * @param {*} api
 * @param {number} currentEquity
 */
async function addCopytrade(strategyName, client, lineUserId, okxUid, api, currentEquity) {
  if((lineUserId === undefined)||(okxUid === undefined)||(strategyName === undefined)){
    throw new Error('addCopytrade() must provide [lineUserId] and [okxUid] and [strategyName]!');
    // return false;
  } else {
    const db = client.db(DB_NAME);
    let userDB = db.collection(USER_COLLECTION);

    checkpoint1 = await userDB.find({ "lineUserId": lineUserId, "strategy.strategyName": strategyName }).toArray();
    checkpoint2 = await userDB.find({ "lineUserId": lineUserId }).toArray();
    // console.log(checkpoint1);
    // console.log(checkpoint2);
    if (checkpoint1.length !== 0 ) {
      throw new Error(`this user is already using strategy [${strategyName}]`);
    } else if (checkpoint2.length === 0) {
      throw new Error(`this user is not a VIP member!`);
    } else if (checkpoint2.length === 1) {
      dataToUpdate = checkpoint2[0];
    }
    newStrategy = {
      strategyName: strategyName,
      okxUid: okxUid,
      api: api,
      initialEquity: currentEquity,
      currentEquity: currentEquity,
      roi: 0.00,
      pnl: 0.00,
      historyEquity: {},
      createTime: `${timeNow()}`,
      updateTime: `${timeNow()}`,
      state: "waiting",
    };
    newStrategy.historyEquity[`${dateNow()}`] = currentEquity;
    dataToUpdate.strategy.push(newStrategy);

    updateResult = await userDB.updateOne({ "lineUserId": lineUserId }, {$set: dataToUpdate}, { upsert: true });
    return updateResult;
  }
}

/**
 * remove a copy strategy in [waiting] state.
 * @param {String} strategyName
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 */
async function removeCP(strategyName, client, lineUserId) {
  if((lineUserId === undefined)||(strategyName === undefined)){
    throw new Error('removeCP() must provide [lineUserId] and [strategyName]!');
  }
  const db = client.db(DB_NAME);
  let userDB = db.collection(USER_COLLECTION);
  let checkpoint1 = await userDB.find({ "lineUserId": lineUserId, "strategy.strategyName": strategyName }).toArray();
  let checkpoint2 = await userDB.find({ "lineUserId": lineUserId }).toArray();

  if (checkpoint1.length === 0 ) {
    throw new Error(`this user is not waiting for strategy [${strategyName}]`);
  } else if (checkpoint2.length === 0) {
    throw new Error(`this user is not a VIP member!`);
  } else if (checkpoint2.length === 1) {
    dataToUpdate = checkpoint2[0];
  }
  dataToUpdate.strategy.filter((value, index, arr) => {
    if (value.strategyName === strategyName) {
      arr.splice(index, 1);
      return true;
    }
    return false;
  });
  updateResult = await userDB.updateOne({ "lineUserId": lineUserId }, {$set: dataToUpdate}, { upsert: true });
  // console.log(dataToUpdate);

  return updateResult;
}

/**
 * update state of a strategy, ex: change state from waiting to copying.
 * @param {String} strategyName
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 * @param {String} state
 */
async function updateCPState(strategyName, client, lineUserId, state) {
  if((lineUserId === undefined)||(strategyName === undefined)){
    throw new Error('removeCP() must provide [lineUserId] and [strategyName]!');
  }
  const db = client.db(DB_NAME);
  let userDB = db.collection(USER_COLLECTION);
  let checkpoint1 = await userDB.find({ "lineUserId": lineUserId, "strategy.strategyName": strategyName }).toArray();
  let checkpoint2 = await userDB.find({ "lineUserId": lineUserId }).toArray();

  if (checkpoint1.length === 0 ) {
    throw new Error(`this user is not waiting for strategy [${strategyName}]`);
  } else if (checkpoint2.length === 0) {
    throw new Error(`this user is not a VIP member!`);
  } else if (checkpoint2.length === 1) {
    dataToUpdate = checkpoint2[0];
  }
  dataToUpdate.strategy.filter((value, index, arr) => {
    if (value.strategyName === strategyName) {
      value.state = state;
      return true;
    }
    return false;
  });
  updateResult = await userDB.updateOne({ "lineUserId": lineUserId }, {$set: dataToUpdate}, { upsert: true });
  // console.log(dataToUpdate);

  return updateResult;
}

/**
 * create user data in the waiting queue (to be review)
 * @param {mongoClient} client 
 * @param {String} lineUserId 
 * @param {String} lineUserName 
 * @param {String} linePFP profile picture URL
 * @param {String} vipPlan "普通方案" | "學生方案" | "體驗方案"
 */
async function addWaiting(client, lineUserId, lineUserName, linePFP, vipPlan) {
  if (lineUserId === undefined) {
    throw new Error('addWaiting() must provide [lineUserId]!');
    // return false;
  } else {
    const db = client.db(DB_NAME);
    let waitingLine = db.collection("waiting");

    dataToUpdate = {
      lineUserId: lineUserId,
      lineUserName: lineUserName,
      linePFP: linePFP,
      vipPlan: vipPlan,
    };

    updateResult = await waitingLine.updateOne({ "lineUserId": lineUserId }, {$set: dataToUpdate}, { upsert: true });
    return updateResult;
  }
}

/**
 * get all user from the waiting queue (to be review)
 * @param {mongoClient} client 
 */
async function getWaiting(client) {
  const db = client.db(DB_NAME);
  let waitingLine = db.collection("waiting");
  let list = await waitingLine.find({}).toArray();

  return list;
}

/**
 * get all pending copytrade request from the queue (to be review)
 * @param {mongoClient} client 
 */
async function getWaitingCP(client) {
  const result = [];
  const db = client.db(DB_NAME);
  let userDB = db.collection(USER_COLLECTION);
  let list = await userDB.find({"strategy.state": "waiting"}).toArray();
  list.forEach(user => {
    user.strategy.forEach(element => {
      if (element.state === "waiting") {
        result.push({
          lineUserId: user.lineUserId,
          lineUserName: user.lineUserName,
          linePFP: user.linePFP,
          strategyName: element.strategyName,
        });
      }
    })
  });
  return result;
}


/**
 * get all current mamber and user
 * @param {mongoClient} client 
 */
async function getAllVip(client) {
  const db = client.db(DB_NAME);
  let userDB = db.collection(USER_COLLECTION);
  let list = await userDB.find({}).toArray();

  return list;
}

/**
 * get uncharge mambers
 * @param {mongoClient} client 
 */
async function getUncharge(client) {
  const db = client.db(DB_NAME);
  let userDB = db.collection(USER_COLLECTION);
  let list = await userDB.find({}).toArray();
  let filtered = [...list].filter((value) => {
    const now = Number(moment( Date.now() ).tz("Asia/Taipei").format("X"));
    const paydayTS = Number(moment(`${ value.payday } 00:00:00`).tz("Asia/Taipei").format("X"));
    // const dueTS = Number(moment(`${ value.due } 23:59:59`).tz("Asia/Taipei").format("X"));
    return ( now > paydayTS );
  })

  return filtered;
}

/**
 * get copytrader with state = "copying"
 * @param {mongoClient} client 
 */
async function getCopying(client) {
  const result = [];
  const db = client.db(DB_NAME);
  let userDB = db.collection(USER_COLLECTION);
  let list = await userDB.find({"strategy.state": "copying"}).toArray();
  list.forEach(user => {
    user.strategy.forEach(element => {
      if (element.state === "copying") {
        result.push({
          lineUserId: user.lineUserId,
          lineUserName: user.lineUserName,
          linePFP: user.linePFP,
          strategyName: element.strategyName,
          api: element.api,
        });
      }
    })
  });
  return result;
}

schema = {
  lineUserId: "lineUserId",
  lineUserName: "lineUserName",
  linePFP: "linePFP",
  vipPlan: "vipPlan",
  strategy:[
    {
      strategyName: "EXAMPLE NAME",
      okxUid: "00000000",
      api: {
        iv: "425dcd47bca4c189cbdb7940e07e53d1",
        content: "1a8c4cc57ed9a54d8a35f1e33644e2591ce7301dae6eed61486a5ef5cd57d4e2a708a95c2a2077bdbef17162a3"
      },
      initialEquity: 10000,
      currentEquity: 12000,
      historyEquity: {
        "2023-04-30": 12000,
        "2023-05-01": 11990,
      },
      createTime: "2023-04-30 00:00:00",
      updateTime: "2023-05-01 00:00:00",
    }
  ],
  payday: "YYYY-MM-DD",
  due: "YYYY-MM-DD",
};


module.exports = {
  round,
  getUserRole, 
  getUserData, 
  dailyUpdateUserEquity,
  createUserData, 
  addCopytrade, 
  addWaiting, 
  getWaiting, 
  getAllVip, 
  removeUserData, 
  removeWaiting, 
  getUncharge, 
  updatePayday, 
  updatePlan, 
  getWaitingCP,
  removeCP,
  updateCPState,
  getCopying
};
