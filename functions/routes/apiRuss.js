const express = require("express");
const router = express.Router();

//======Upload questions to Firebase=======
router.post("/addQuestion", (req, res) => {
  let database = req.app.get("database");
  let request = req.body;
  let worldID = request.worldID;
  let sectionID = request.section;
  let difficulty = request.difficulty;

  let question = request.questions;
  let options = request.options;
  let answer = request.answer;

  let databaseRef = database.ref("QuestionBank");
  databaseRef = databaseRef.child(worldID);
  databaseRef = databaseRef.child(sectionID);
  databaseRef = databaseRef.child(difficulty);

  databaseRef.push({
    question: question,
    options: options,
    answer: answer
  });
  res.end("upload complete");
});

//=====Get Player stars achieved for world========
function constructpayload(pid, wid, obj) {
  let totalscore = 0;
  Object.keys(obj[wid]).forEach(section => {
    if (typeof obj[wid][section][pid] !== "undefined") {
      totalscore = totalscore + parseInt(obj[wid][section][pid]["stars"]);
    }
  });

  let payload = { user: pid, stars: totalscore };

  return payload;
}

router.get("/getStar", (req, res) => {
  let database = req.app.get("database");
  // let request = req.body
  let matric = req.query.matric;
  let worldID = req.query.worldID;
  let payload = "";

  let databaseRef = database.ref("Maps");

  databaseRef.once("value", function(snapshot) {
    let worldObj = snapshot.val();
    payload = constructpayload(matric, worldID, worldObj);
    res.json(payload);
  });
});

//===Get Player stars achieved for world===
router.get("/getques", (req, res) => {
  let database = req.app.get("database");
  // let request = req.body
  let worldID = req.query.worldID;
  let sectionID = req.query.sectionID;

  let databaseRef = database.ref("QuestionBank");
  databaseRef = databaseRef.child(worldID);
  databaseRef = databaseRef.child(sectionID);
  databaseRef.once("value", function(snapshot) {
    let queslist = snapshot.val();
    res.json(queslist);
  });
});

//==========Create Arena Questions==============
router.post("/addArenaQuestion", (req, res) => {
  let database = req.app.get("database");
  let request = req.body;
  
  let creator = request.creator;
  let question = request.questions;
  let options = request.options;
  let answer = request.answer;
  let attempts = request.attempts;

  let databaseRef = database.ref("Arena");
  databaseRef = databaseRef.child("Questions");

  databaseRef.push({
    question: question,
    options: options,
    answer: answer,
    creator: creator,
    attempts: attempts,
  });
  res.end("Arena upload complete");
});

//==========Set Arena Question Score==============

// function getAttempts(playerRef) {

//   return playerRef.once("value").then(function(snapshot) {
//     let quesObj = snapshot.val();
//     let len_of_attempts = Object.keys(quesObj).length; 
//     return len_of_attempts;
//   }).catch((err)=>{
//     throw new Error(err)
//   });
// }

function getMedal(matric, database){
  
  let arenaRef = database.ref("Arena").child("Questions")
  return arenaRef.once("value").then(function(snapshot){
    let questionObj = snapshot.val();
    let quesKeys = Object.keys(questionObj);
    let medalcount = 0
    for(let i =0; i< quesKeys.length;i++){
        if ('players' in questionObj[quesKeys[i]]){
          if (matric in questionObj[quesKeys[i]]['players']){
            medalcount = medalcount + questionObj[quesKeys[i]]['players'][matric]['medal']
          }
        }
    }

    let userRef = database.ref("Students").child(matric);
    userRef.update({medals:medalcount})
    return "ok"
  }).catch((err)=>{
    throw new Error(err);
  });
}

// function updateMedal(matric, database){
  
//   getMedal(matric, database).then((medalcount)=>{
//     let userRef = database.ref("Students").child(matric);
//     userRef.update({medals:medalcount})
//   }).catch((err)=>{
//     throw new Error(err);
//   })
// }

router.post("/setArenaQuestionScore", (req, res) => {
  let database = req.app.get("database");
  let request = req.body;
  
  let qid = request.questionID;
  let matric = request.matric;
  let medal = request.medal;

  let databaseRef = database.ref("Arena");
  let questionRef = databaseRef.child("Questions");
  let qidRef = questionRef.child(qid);
  let playerRef = qidRef.child("players");
  let matricRef = playerRef.child(matric);
  
  matricRef.set({medal: medal});

  return getMedal(matric, database).then((status)=>{
    playerRef.once("value", function(snapshot){
      let quesObj = snapshot.val();
      let len_of_attempts = Object.keys(quesObj).length; 
      qidRef.update({attempts:len_of_attempts})
    })
    res.end("ok");
    return status;
    // res.json(status);
  }).catch((err)=>{
    throw err;
  })

  // getAttempts(playerRef).then((attempt)=>{
  //   qidRef.update({attempts:attempt})
  //   res.json("Ok");
  // }).catch((err)=>{
  //   res.json(err);
  // })

});

//==========Fetch all Arena Question ==============

router.get("/getArenaQuestions", (req, res) => {

  let database = req.app.get("database");

  let databaseRef = database.ref("Arena");
  databaseRef = databaseRef.child("Questions");
  
  databaseRef.once("value", function(snapshot) {
    let queslist = snapshot.val();
    let dict = {}

    Object.keys(queslist).forEach(info=>{
      let jsonObj = {question: queslist[info]['question'], creator: queslist[info]['creator'], 
                      attempts: queslist[info]['attempts'], players: queslist[info]['players']}
      dict[info] = jsonObj
    })

    res.json(dict);
  });
});


//==========Get Selected Arena Question info ==============

router.get("/getSelectArenaQuestions", (req, res) => {
  
  let qid = req.query.questionID;
  let database = req.app.get("database");

  let databaseRef = database.ref("Arena");
  databaseRef = databaseRef.child("Questions");
  databaseRef = databaseRef.child(qid);
  databaseRef.once("value", function(snapshot) {
    let quesInfo = snapshot.val();
    res.json(quesInfo);
  });
});

//==========Get All Worlds and Respective Population==============

function getPopulation(worldID, worldObj){
    
    let userArr = [];
    Object.keys(worldObj).forEach(sections=>{
        let section = worldObj[sections]; 
        Object.keys(section).forEach(user => {
          if (userArr.indexOf(user) === -1) {
            userArr.push(user); 
          }
        });
    })

    let woridPopulationObj = {worldID: worldID, population: userArr.length}
    return woridPopulationObj;
}

router.get("/getAllWorldPopulation", (req,res)=>{

  let database = req.app.get("database");
  let worldRef = database.ref("Maps"); 

  worldRef.once("value", function(snapshot) {
    let worlds = snapshot.val(); 
    let worldPopulationArray = []
    Object.keys(worlds).forEach(world => {
        let populationObj = getPopulation(world, worlds[world])
        worldPopulationArray.push(populationObj)
    });
    
    res.json(worldPopulationArray); 
  });

})


module.exports = router;
