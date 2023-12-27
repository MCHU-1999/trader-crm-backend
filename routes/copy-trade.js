require('dotenv').config();
var cors = require('cors');
const express = require('express');
const router = express.Router();
const { getUserData, createUserData, round, getUserRole, addCopytrade, addWaiting, getCopying } = require('../util/copyTrade');
const { getData, vip, getFromMongo } = require('../util/google-sheet');
const { okxApi } = require('../util/tts-okx');
const { decrypt } = require('../util/crypto');
const { MongoClient } = require('mongodb');

// create DB client -------------------------------
const lineMongoURI = process.env.LINE_MONGODB;
const mongoClient = new MongoClient(lineMongoURI);
console.log('new DB client! (lineCRM)');

const wrongPasswordMsg = "Invalid Password!";
const apiPassword = process.env.API_PASSWORD;
// ------------------------------------------------

// 品兆要跟單者資料
router.get('/copiers', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    }else{
      let result = await getCopying(mongoClient);
  
      res.status(200).send({
        status: 'success',
        data: result,
      });
      res.end();
    }
  }catch (errorMsg) {
    console.log(`error: ${errorMsg}`);
    res.status(417).send({
      status: 'error',
      data: errorMsg,
    });
    res.end();
  }
});

// 產品列表叫用報單績效
router.get('/performance/demo', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    }else{
      let result = await getFromMongo(mongoClient);
  
      res.status(200).send({
        status: 'success',
        data: result,
      });
      res.end();
    }
  }catch (errorMsg) {
    console.log(`error: ${errorMsg}`);
    res.status(417).send({
      status: 'error',
      data: errorMsg,
    });
    res.end();
  }
});

// 產品列表叫用抄底策略資料
router.get('/performance/btc', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    }else{
      console.log(req.body);
      result = await getFromMongo(mongoClient);
      result = result[1];
      // console.log(result);

      for (let eachStrategy of result.data) {
        let chartX = [];
        let chartY = [];
        // chartY.push(eachStrategy.initialEquity);
        // chartX.push('跟單起始');
        for(let eachKey of Object.keys(eachStrategy.historyEquity)){
          chartX.push(eachKey);
          chartY.push(eachStrategy.historyEquity[eachKey]);
        }
        eachStrategy["chartX"] = chartX;
        eachStrategy["chartY"] = chartY;
      }
      console.log(result.data);
      res.status(200).send({
        status: 'success',
        data: result.data,
      });
      res.end();
    }
  }catch (errorMsg) {
    console.log(`error: ${errorMsg}`);
    res.status(417).send({
      status: 'error',
      data: errorMsg,
    });
    res.end();
  }
});

// 『我的跟單』頁面顯示跟單績效api
router.post('/getUserData', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    }else{
      console.log(req.body);
      const lineId = req.body.lineId;
      // const strategyName = req.body.strategyName;
      result = await getUserData(undefined, mongoClient, lineId);
      console.log(result);
      if (Object.keys(result).length === 0) {
        // user doesn't exist!
        res.status(200).send({
          status: 'success',
          data: {},
        });
        res.end();
      } else {
        for (let eachStrategy of result.strategy) {
          let chartX = [];
          let chartY = [];
          // chartY.push(eachStrategy.initialEquity);
          // chartX.push('跟單起始');
          for(let eachKey of Object.keys(eachStrategy.historyEquity)){
            chartX.push(eachKey);
            chartY.push(eachStrategy.historyEquity[eachKey]);
          }
          eachStrategy["chartX"] = chartX;
          eachStrategy["chartY"] = chartY;
        }
        // console.log(result);
        res.status(200).send({
          status: 'success',
          data: result,
        });
        res.end();
      }
    }
  }catch (errorMsg) {
    console.log(`error: ${errorMsg}`);
    res.status(417).send({
      status: 'error',
      data: errorMsg,
    });
    res.end();
  }
});

// 使用者加入跟單queue
router.post('/newUser', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    }else{
      console.log(req.body);
      const lineId = req.body.lineId;
      const strategyName = req.body.strategy;
      const uid = req.body.uid;
      const encryptApi = req.body.api;
      const decryptApi = JSON.parse(decrypt(encryptApi));
      
      const apiKey = decryptApi.apiKey;
      const apiSecret = decryptApi.apiSecret;
      const passphrase = decryptApi.passphrase;

      var equity = 0;
      let okxAccount = new okxApi({
        apiKey: apiKey,
        secret: apiSecret,
        password: passphrase
      });

      let resData = await okxAccount.fetchEquity();
      console.log(resData);
      if (resData.code !== '0') {
        if ((resData.msg === 'Invalid OK-ACCESS-KEY')||(resData.msg === 'Invalid Sign')||(resData.msg === 'Request header OK-ACCESS-PASSPHRASE incorrect.')){
          res.status(200).send({
            status: 'error',
            data: 'wrong key',
          });
          res.end();
        } else {
          res.status(200).send({
            status: 'error',
            data: 'unknown',
          });
          res.end();
        }
      } else {
        equity = round(parseFloat(resData.data[0].totalEq), 2);
        if (lineId === 'Uc17989a2bbda9aef52e89393db74e81f') {
          result = await addCopytrade(strategyName, mongoClient, lineId, uid, encryptApi, equity);
          res.status(200).send({
            status: 'success',
            data: 'ok',
          });
          res.end();
        } else if (strategyName === 'VIP跟單') {
          if (equity < 1100) {
            res.status(200).send({
              status: 'error',
              data: 'low equity',
            });
            res.end();
          } else {
            result = await addCopytrade(strategyName, mongoClient, lineId, uid, encryptApi, equity);
            res.status(200).send({
              status: 'success',
              data: 'ok',
            });
            res.end();
          }
        } else if (strategyName === '高倍VIP跟單') {
          if (equity < 550) {
            res.status(200).send({
              status: 'error',
              data: 'low equity',
            });
            res.end();
          } else {
            result = await addCopytrade(strategyName, mongoClient, lineId, uid, encryptApi, equity);
            res.status(200).send({
              status: 'success',
              data: 'ok',
            });
            res.end();
          }
        } else {
          // result = await addCopytrade(strategyName, mongoClient, lineId, uid, encryptApi, equity);
          res.status(200).send({
            status: 'error',
            data: 'unknown',
          });
          res.end();
        }
      }
    }
  }catch (errorMsg) {
    console.log(`error: ${errorMsg}`);
    res.status(417).send({
      status: 'error',
      data: errorMsg,
    });
    res.end();
  }
});

module.exports = router;