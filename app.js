import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

import * as admin from 'firebase-admin';

const serviceAccount = require("./fireKey/barstoolscore.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://barstoolscore.firebaseio.com"
});

let db = admin.firestore();

let games = [];

app.use(cors());

// get all games once a get request is made to api
app.get("/api/v1/games", (req, res) => {
  let isWithin15 = false;
  games = [];

  // query cache
  db.collection("games").get().then(async (snapshot) => {
    snapshot.forEach((doc) => {
      // set isWithin15 true if either object was created <15 seconds ago
      if (Date.now() - doc.data().createdAt < 15000){
        isWithin15 = true;
      }
      // add each object to local games array
      games.push(doc.data());
    });
    if (isWithin15) {
      console.log("15");
      // return current local games
      res.status(200).send({
        success: "true",
        games: games
      });
    } else {
      // await api fetches
      let reqGames = await requestGamesFromFeed();
      res.status(200).send({
        success: "true",
        games: games
      });
    }
  });

});

const PORT = 8440;

app.listen(PORT, () => {
  console.log(`running on ${PORT}`);
  requestGamesFromFeed();
});

// helper functions
let requestGamesFromFeed = async () => {
  // clear local games array and firebase store
  games = [];
  await deleteGames().then(async () => {
    // fetch from data sources
    await axios.all([
      axios.get("https://chumley.barstoolsports.com/dev/data/games/6c974274-4bfc-4af8-a9c4-8b926637ba74.json"),
      axios.get("https://chumley.barstoolsports.com/dev/data/games/eed38457-db28-4658-ae4f-4d4d38e9e212.json")
    ]).then(axios.spread((response1, response2) => {
      console.log("fetched res1");
      // store current timestamp
      response1.data.createdAt = Date.now();
      // push to local games array
      games.push(response1.data);
      // add to firebase store
      let setDoc = db.collection("games").doc().set(response1.data);
      console.log("fetched res2");
      response2.data.createdAt = Date.now();
      games.push(response2.data);
      setDoc = db.collection("games").doc().set(response2.data);
      return games;
    })).catch(error => {
      console.log(error);
    });
  });
};

// clear firebase store
let deleteGames = async () => {
  await deleteCollection(db, "games", 50);
}

// function provided by firebase api docs
function deleteCollection(db, collectionPath, batchSize) {
  let collectionRef = db.collection(collectionPath);
  let query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, batchSize, resolve, reject);
  });
}

// function provided by firebase api docs
function deleteQueryBatch(db, query, batchSize, resolve, reject) {
  query.get()
    .then((snapshot) => {
      // When there are no documents left, we are done
      if (snapshot.size == 0) {
        return 0;
      }

      // Delete documents in a batch
      let batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      return batch.commit().then(() => {
        return snapshot.size;
      });
    }).then((numDeleted) => {
      if (numDeleted === 0) {
        resolve();
        return;
      }

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(db, query, batchSize, resolve, reject);
      });
    })
    .catch(reject);
}