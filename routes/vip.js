require('dotenv').config();
var cors = require('cors');
const express = require('express');
const router = express.Router();
const { getUserData, createUserData, round, getUserRole, addCopytrade, addWaiting, getWaiting, getAllVip, removeUserData, getUncharge, updatePayday, updatePlan, removeWaiting, getWaitingCP, removeCP, updateCPState } = require('../util/copyTrade');
const { MongoClient } = require('mongodb');

// create DB client -------------------------------
const lineMongoURI = process.env.LINE_MONGODB;
const mongoClient = new MongoClient(lineMongoURI);
console.log('new DB client! (lineCRM)');

const wrongPasswordMsg = "Invalid Password!";
const apiPassword = process.env.API_PASSWORD;
// ------------------------------------------------


// GET functions 
// GET已經是會員的人，要收費的人
router.get('/toBeCharge', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      let result = await getUncharge(mongoClient);
      // console.log(result);

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

// GET ALL
router.get('/allMember', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      let result = await getAllVip(mongoClient);

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

// GET 待審核的會員
router.get('/waitingList', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      let result = await getWaiting(mongoClient);

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

// 排隊等跟單審核的人
router.get('/waitingCP', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      let result = await getWaitingCP(mongoClient);

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

// POST functions 
// 取得會員身份
router.post('/userRole', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      console.log(req.body);
      const lineId = req.body.lineId;
      result = await getUserRole(mongoClient, lineId);
      // console.log(result);

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

// 使用者加入等待清單
router.post('/signUp', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      console.log(req.body);
      const lineId = req.body.lineId;
      const lineUserName = req.body.lineUserName;
      const linePFP = req.body.linePFP;
      const plan = req.body.plan;
      result = await addWaiting(mongoClient, lineId, lineUserName, linePFP, plan);
      // console.log(result);
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

// 確認、審核使用者加入
router.post('/confirm', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      console.log(req.body);
      const lineId = req.body.lineId;
      result = await createUserData(mongoClient, lineId);

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

// 更新使用者付費日期
router.post('/updatePay', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      console.log(req.body);
      const lineId = req.body.lineId;
      result = await updatePayday(mongoClient, lineId);

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

// 更新使用者方案
router.post('/updatePlan', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      console.log(req.body);
      const lineId = req.body.lineId;
      const plan = req.body.plan;
      const payday = req.body.payday;
      const due = req.body.due;
      result = await updatePlan(mongoClient, lineId, plan, payday, due);

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

// 移除會員資格
router.post('/removeVip', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      console.log(req.body);
      const lineId = req.body.lineId;
      result = await removeUserData(mongoClient, lineId);

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

// 拒絕使用者加入審核
router.post('/removeWaiting', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      console.log(req.body);
      const lineId = req.body.lineId;
      result = await removeWaiting(mongoClient, lineId);

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

// 解除跟單
router.post('/removeCP', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      console.log(req.body);
      const lineId = req.body.lineId;
      const strategyName = req.body.strategyName;
      result = await removeCP(strategyName, mongoClient, lineId);

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

// 審核跟單申請
router.post('/confirmWaitingCP', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    } else {
      console.log(req.body);
      const lineId = req.body.lineId;
      const strategyName = req.body.strategyName;
      result = await updateCPState(strategyName, mongoClient, lineId, "copying");

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


module.exports = router;