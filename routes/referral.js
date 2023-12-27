require('dotenv').config();
var cors = require('cors');
const express = require('express');
const router = express.Router();
const { updateRelationship, updateMap, getUserId, getReferralCode, getTempFromId, updateTemp } = require('../util/referral');
const { MongoClient } = require('mongodb');

const mongoURI = process.env.LINE_MONGODB;
const mongoClient = new MongoClient(mongoURI);
console.log('new DB client! (referral)');

const wrongPasswordMsg = "Invalid Password!";
const apiPassword = process.env.API_PASSWORD;

router.post('/updateTempData', async (req, res) => {
  try{
    const password = req.header('password');
    if (password !== apiPassword) {
      res.status(417).send({
        status: 'error',
        msg: wrongPasswordMsg
      });
      res.end();
    }else{
      const fromId = await getUserId(mongoClient, req.body.from);
      const toId = req.body.toId;
      result = await updateTemp(mongoClient, fromId, toId);
      console.log(result);
  
      res.status(200).send({
        status: 'success',
        data: result,
      });
      res.end();
    }
  }catch (errorMsg) {
    res.status(417).send({
      status: 'error',
      data: errorMsg,
    });
    res.end();
  }
});



module.exports = router;