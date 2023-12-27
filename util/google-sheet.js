const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const moment = require('moment-timezone');
moment.tz.setDefault("Asia/Taipei");

const { MongoClient } = require('mongodb');
const mongoClient = MongoClient;
const DB_NAME = "CustomerAdou";


function dateNow() {
  return moment( Date.now() ).tz("Asia/Taipei").format("YYYY-MM-DD"); 
}
function timeNow() {
  return moment( Date.now() ).tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss"); 
}
function round(numToBeRound, digits){
  return Math.round((numToBeRound + Number.EPSILON)*(10**digits)) / (10**digits);
}

/**
 * @param {String} docID the document ID
 * @param {String} sheetID the google sheet table ID, 14444089 / 1611165434
 */
async function getData(docID, sheetID) {
  const result = {
    title: "",
    timestamp: [],
    pnl: [],
  };
  const serviceAccountAuth = new JWT({
    email: "toriii-line-crm@copytrade-line-crm.iam.gserviceaccount.com",
    key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCvKKP823Fd2/6v\nR7da0BIRLCbgGNAjt9OzSYiAYRfERTMUYJ8RDjqZkCHGg/GEzmxGQrq6VtEQMAuC\nqiBGDMq92a1aGa+UzrbWETSFmbEI83hyyaku1ZbZkXbp9YQBhcxQW6DtrE9f/0/P\nrkBmAzIHFc3bwR9nFhEcLbPcpJQrsVnAIwCb+YR14ChqkY82qu5ru8ttLUbpTiyT\nNHuGWjf88I+XJKc01RXnsgqvGE5HlQPYlWEXdDJV0Vr3/9lzKsg+ZISClXgG+Nw+\npaXmyqWuz03tQM7/zS/fgG+Kdm5/aHJrQfLnRIg/MAvckPU0awkfpEhMiNRffaNN\nBU41sbRxAgMBAAECggEADYaVITe92ZpdIKJoV4AlQQO4jcoEupldpOTbAFTfDbYt\nQ1fRuLKxVj3hyc9TBWceR8+r1StSkg4vuVuTSe1/c2kdgI1muFY9Gqsx89YiLFeG\nt9B4OsheEXdw6BCgLLDtDdCBjRDnATn5Kweg6++3u4HUx3EykFaNJDCoSLPByFzU\n5k5gi0cexge0jpqmDNeTr43FMALaPocNPonEBZmQNFtuRA2JVl4KmAbkyKc9PPau\npZOp0WHZxb7JQLBIl+1lOPcf2HoBpjja/gzUhJ4eKCPtq+NAilK55yeXLut8alt8\nAi8tzquKa6OBJ2pOaHwE7uUYsODiBuy6ou3XocxX8QKBgQDvhYZwBnneMHj64uLa\nWYuEjYVU0uffqj0AZaASXjkq45xsPHz8MOkdzQqqLoo1BMxOfuOPDOb+5mliPPQb\n8FEVAzj4RVFToBqmLHb1OABsD75ju86I0AK4tVSFaSsy5nM00XRANOLSVBobJqwT\nbK89GKh2++/YtMi0EeFMXKxsCQKBgQC7NY07epdvRvWo6tt6up320U2UzO4rJPM2\nV1Zj2iKAtAZLKmgP/RYSIHjFqG2G9SouTLDti3J/JN2YatdE2rSDJOUeAjcY8gC8\nz1r8o634zvQXNfcKBjI633uIEdtVZ2omdku056fhcB3N3Hrm3+eIP0igkH7vto5c\nK9ov+XjvKQKBgDkd0i0snisJzA+nwwjmiYqWZNERahG/+sP5d+5pYaCEnmyBEBzj\nXPOqTXy/lF2IQ2AEiic2oG7wavjuKBfxeqRUHGW3wej7KN+vgr5/GDqslm4Z/upJ\nEB0TwI//wDlnEtnpiJs3AU++lmsbEbWgGTmsg5+7/DnlAmdOTDd1cfhhAoGAeWFT\nXQkzPpcHmKoN/BkbanhykNP+aELg3o7qGHvKeyA+JGYuao9xy/b5105JFYPIAZT/\n8kTDy+QfOT+sq5wSBiXZ2AcfqjDegY0ANWX62qN0Z8g5kGpMDxfvhF3vlAQlMyLo\nGzdIBkcnS950YVUzTYeak2CcrNf0nZZhNVHPM2ECgYB4jAX6kRex0j0PrpdFBSfX\nbLwnjGQn1PU9z3LHLyAlZgssEsXa2ITG7A9oFwtlhtDEttsXyUQuuUbV0Qi007Nb\n+Fy4qpqLv1IZumYa1Q91s4r0zOxMs6HYk6/dQd2NpTQHgaVD322LC/SUMatoMLsl\nv0M+vEQ04d8lMTqUZdZ+0w==\n-----END PRIVATE KEY-----\n",
    scopes: [ 'https://www.googleapis.com/auth/spreadsheets' ],
  });
    
  const doc = new GoogleSpreadsheet(docID, serviceAccountAuth);

  await doc.loadInfo();
  const sheet = doc.sheetsById[sheetID];
  result.title = sheet.title;
  const rows = await sheet.getRows();
  for (let row of rows) {
    let date = row.get('日期').split('/');
    let dateObj = new Date(2023, date[0]-1, date[1], 12, 0, 0);
    // console.log(date);
    // console.log(dateObj);
    result.timestamp.push(parseInt(moment(dateObj).tz("Asia/Taipei").format("X")));
    let pnl = row.get('').split(',');
    result.pnl.push(parseInt(pnl.join('')));
  }
  return result;
};

/**
 * @param {JSON} data 
 * @param {Number} fund 
 */
async function vip(data, fund = 10000.0){
  try {
    const TS = data.timestamp;
    const PNL = data.pnl;
    const startTimestamp = TS[0];
    const endTimestamp = parseInt(moment(`${ dateNow() } 23:59:59`).tz("Asia/Taipei").format("X"));
    var pnlInDays = Array(parseInt((endTimestamp-startTimestamp)/86400) + 1).fill(0);
    // console.log(endTimestamp);

    var day=0;
    for (let i=0; i<TS.length; i++){
      day = parseInt((TS[i]-startTimestamp)/86400);
      // console.log(parseInt(PNL[i]));
      // console.log(parseInt(pnlInDays[day]));
      pnlInDays[day] += PNL[i];
    }

    let x = [];
    let y = [];
    y.push(pnlInDays[0] + fund);
    for(let i=0; i<pnlInDays.length; i++){
      x.push(i + 1);
      if (i !== 0){
        y.push(pnlInDays[i] + y[i - 1]);
      }
    }

    return {
      "traderName": data.title,            // 交易員名稱
      "positionCount": PNL.length,         // 總計開倉數
      "chartX": x,
      "chartY": y,
    };
  }catch(errorMsg){
    console.log(errorMsg);
  }
};

/**
 * get adou trade performance from mongo DB
 * @param {mongoClient} client 
 */
async function getFromMongo(client) {
  const db = client.db(DB_NAME);
  let performanceDB = db.collection("performance");
  let list = await performanceDB.find({}).toArray();
  if (list.length === 0) {
    throw new Error('no performance data in DB!'); 
  } else {
    return list;
  }
}
  
module.exports = { getData, vip, getFromMongo };