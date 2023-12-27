require('dotenv').config();
const { MongoClient } = require('mongodb');
const Srand = require('seeded-rand');


const mongoClient = MongoClient;


function generateCode(seedNumber = 0){
  const rnd = new Srand();

  //  Set a seed
  rnd.seed(seedNumber);
  return rnd.intInRange(11111111, 99999999);
};

/**
 * get referral code from map DB
 * @param {mongoClient} client 
 * @param {String} userId 
 */
async function getReferralCode(client, userId) {
  if(userId === undefined){
    throw new Error('userId cannot be undefined!');
    // return false;
  }else{
    const db = client.db("Referral");
    let mapDB = db.collection("referralCodeMap");
    let result = await mapDB.find({ "userId": userId }).toArray();

    return result[0];
  }
}

/**
 * get user id from map DB
 * @param {mongoClient} client 
 * @param {String} referralCode 
 */
async function getUserId(client, referralCode) {
  if(referralCode === undefined){
    throw new Error('referralCode cannot be undefined!');
    // return false;
  }else{
    const db = client.db("Referral");
    let mapDB = db.collection("referralCodeMap");
    let result = await mapDB.find({ "referralCode": referralCode }).toArray();
    if(result.length === 0){
      // cannot find map id.
      return '00000000';
    }else{
      return result[0].fromId;
    }
  }
}

/**
 * get fromId from temp relationship
 * @param {mongoClient} client 
 * @param {String} toId invitee ID
 */
async function getTempFromId(client, toId) {
  if (toId === undefined) {
    throw new Error('toId cannot be undefined!');
    // return false;
  }else{
    const db = client.db("Referral");
    let tempDB = db.collection("tempRelationship");
    let result = await tempDB.find({ "toId": toId }).toArray();
    if (result.length === 0) {
      return '00000000';
    }else{
      return result[0].fromId;
    }
  }
}

/**
 * update "tempRelationship" data
 * @param {mongoClient} client 
 * @param {String} fromId invitor ID
 * @param {String} toId invitee ID
 */
async function updateTemp(client, fromId, toId) {
  if ((fromId === undefined) || (toId === undefined)) {
    throw new Error('Neither fromId nor toId can be undefined!');
    // return false;
  }else{
    const db = client.db("Referral");
    let tempDB = db.collection("tempRelationship");
    let dataToUpdate = {
      "fromId": fromId,
      "toId": toId,
    };
    let updateResult = await tempDB.updateOne({ "toId": toId }, {$set: dataToUpdate}, { upsert: true });
    
    return updateResult;
  }
}

/**
 * @param {mongoClient} client 
 * @param {String} userId 
 * @param {String} referralCode 
 */
async function updateMap(client, userId = undefined, referralCode = undefined) {
  if(userId === undefined){
    throw new Error('userId cannot be undefined!');
    // return false;
  }else{
    const db = client.db("Referral");
    let mapDB = db.collection("referralCodeMap");
    let result = await mapDB.find({ "userId": userId }).toArray();

    var dataToUpdate = {};

    if(referralCode === undefined){   // create a new map
      dataToUpdate = {
        userId: userId,
        referralCode: generateCode((Date.now()/1000)),
      };
    }else{
      dataToUpdate = {
        userId: userId,
        referralCode: referralCode,
      };
    }
    if(result.length === 0){
      await mapDB.insertOne(dataToUpdate);
    }else{
      await mapDB.deleteMany({ "userId": userId });
      await mapDB.insertOne(dataToUpdate);
    }
    console.log('updateMap() - done.');
    return dataToUpdate;
  }
}

/**
 * write relationship into "relationship DB" (this process can only be done once)
 * @param {mongoClient} client 
 * @param {String} fromId 
 * @param {String} toId 
 */
async function updateRelationship(client, fromId, toId) {

  // syntax example:
  // {
  //   head: USERID,
  //   first: [USERID, ...],
  //   second: [USERID, ...]
  // }

  var relationData;
  var dataToUpdate;
  
  const db = client.db("Referral");
  let relationDB = db.collection("relationship");

  relationData = await relationDB.find({"first": toId}).toArray();
  if(relationData.length !== 0){
    // this user has been invited by someone else
    console.log('updateRelationship() - user has been invited by someone else');
    return false
  }else{
    // update HEAD  
    relationData = await relationDB.find({"head": fromId}).toArray();
    if(relationData.length === 0){    // no data, initialize
      dataToUpdate = {
        head: fromId,
        first: [toId],
        second: [],
      };
    }else{
      dataToUpdate = relationData[0];
      dataToUpdate.first.push(toId);
    }
    await relationDB.updateOne({ "head": fromId }, {$set: dataToUpdate}, { upsert: true });

    // update FIRST
    relationData = await relationDB.find({ "first": fromId }).toArray();
    for(let each of relationData){
      dataToUpdate = each;
      dataToUpdate.second.push(toId);
      await relationDB.updateOne({ "head": each.head }, {$set: dataToUpdate}, { upsert: true });
    }

    // update SECOND
    relationData = await relationDB.find({ "second": fromId }).toArray();
    for(let each of relationData){
      dataToUpdate = each;
      dataToUpdate.second.push(toId);
      await relationDB.updateOne({ "head": each.head }, {$set: dataToUpdate}, { upsert: true });
    }

    // create HEAD (new user)
    await relationDB.insertOne({
      head: toId,
      first: [],
      second: [],
    });
    return true
  }
}



module.exports = { getReferralCode, getUserId, updateRelationship, updateMap, getTempFromId, updateTemp };