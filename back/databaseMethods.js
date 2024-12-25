import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// dotenv setup
dotenv.config();
const oddsAPIKey = process.env.ODDSAPI_KEY;
const dbUrl = process.env.DB_URL;

// Mongo setup
const client = new MongoClient(dbUrl);
let isConnected = false;

async function connectToDb() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log("Connected to MongoDB");
  }
}

// Close client on server close
process.on("SIGINT", async () => {
  console.log("Closing MongoDB connection...");
  await client.close();
  isConnected = false;
  process.exit(0);
});

// Get list of active sports
export async function getActiveSports() {
  try {
    const url = `https://api.the-odds-api.com/v4/sports/?apiKey=${oddsAPIKey}`;
    const response = await fetch(url);
    const data = await response.json();

    let listOfSports = [];

    for (var i = 0; i < data.length; i++) {
      if (data[i].active === true) {
        listOfSports.push(data[i].key);
      }
    }

    return listOfSports;
  } catch (e) {
    console.error("Failed to fetch list of sports:", e);
    throw e;
  }
}

// Reset database function
export async function resetDatabase(sport) {
  try {
    await connectToDb();

    // Update h2h
    await client
      .db("jodds")
      .collection("h2h")
      .updateOne(
        { sport: sport },
        {
          $set: {
            games: [],
          },
        },
        { upsert: true }
      );

    // Update spreads
    await client
      .db("jodds")
      .collection("spreads")
      .updateOne(
        { sport: sport },
        {
          $set: {
            games: [],
          },
        },
        { upsert: true }
      );

    // Update totals
    await client
      .db("jodds")
      .collection("totals")
      .updateOne(
        { sport: sport },
        {
          $set: {
            games: [],
          },
        },
        { upsert: true }
      );
  } catch (e) {
    console.error("Error resetting database:", e);
    throw e;
  }
}

// Refresh h2h games
export async function refreshH2H(sport) {
  try {
    await connectToDb();
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsAPIKey}&regions=us&markets=h2h`;
    const response = await fetch(url);
    const data = await response.json();

    for (var i = 0; i < data.length; i++) {
      // Set vars for best odds for each team
      var bestOdds1 = 0.0;
      var bestBookmaker1 = "";
      var bestOdds2 = 0.0;
      var bestBookmaker2 = "";

      // Add each game as document to games array
      await client
        .db("jodds")
        .collection("h2h")
        .updateOne(
          { sport: sport },
          {
            $push: {
              games: {
                _id: data[i].id,
                team1: data[i].home_team,
                team2: data[i].away_team,
                bookmakers: [],
                odds1: [],
                odds2: [],
                bestOdds1: 0.0,
                bestBookmaker1: "",
                bestOdds2: 0.0,
                bestBookmaker2: "",
              },
            },
          },
          { upsert: true }
        );

      // Add bet details of each game
      for (var j = 0; j < data[i].bookmakers.length; j++) {
        await client
          .db("jodds")
          .collection("h2h")
          .updateOne(
            { sport: sport, "games._id": data[i].id },
            {
              $push: {
                "games.$.bookmakers": data[i].bookmakers[j].title,
                "games.$.odds1":
                  data[i].bookmakers[j].markets[0].outcomes[0].price,
                "games.$.odds2":
                  data[i].bookmakers[j].markets[0].outcomes[1].price,
              },
            },
            { upsert: true }
          );

        if (bestOdds1 < data[i].bookmakers[j].markets[0].outcomes[0].price) {
          bestOdds1 = data[i].bookmakers[j].markets[0].outcomes[0].price;
          bestBookmaker1 = data[i].bookmakers[j].title;
        }

        if (bestOdds2 < data[i].bookmakers[j].markets[0].outcomes[1].price) {
          bestOdds2 = data[i].bookmakers[j].markets[0].outcomes[1].price;
          bestBookmaker2 = data[i].bookmakers[j].title;
        }

        await client
          .db("jodds")
          .collection("h2h")
          .updateOne(
            { sport: sport, "games._id": data[i].id },
            {
              $set: {
                "games.$.bestOdds1": bestOdds1,
                "games.$.bestBookmaker1": bestBookmaker1,
                "games.$.bestOdds2": bestOdds2,
                "games.$.bestBookmaker2": bestBookmaker2,
              },
            },
            { upsert: true }
          );
      }
    }
  } catch (e) {
    console.log("Error refreshing H2H:", e);
    throw e;
  }
}

// Refresh spread games
export async function refreshSpreads(sport) {
  try {
    await connectToDb();
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsAPIKey}&regions=us&markets=spreads`;
    const response = await fetch(url);
    const data = await response.json();

    for (var i = 0; i < data.length; i++) {
      // Add each game as document to games array
      await client
        .db("jodds")
        .collection("spreads")
        .updateOne(
          { sport: sport },
          {
            $push: {
              games: {
                _id: data[i].id,
                team1: data[i].home_team,
                team2: data[i].away_team,
                bookmakers: [],
                odds1: [],
                odds2: [],
                points1: [],
                points2: [],
              },
            },
          },
          { upsert: true }
        );

      // Add bet details of each game
      for (var j = 0; j < data[i].bookmakers.length; j++) {
        await client
          .db("jodds")
          .collection("spreads")
          .updateOne(
            { sport: sport, "games._id": data[i].id },
            {
              $push: {
                "games.$.bookmakers": data[i].bookmakers[j].title,
                "games.$.odds1":
                  data[i].bookmakers[j].markets[0].outcomes[0].price,
                "games.$.points1":
                  data[i].bookmakers[j].markets[0].outcomes[0].point,
                "games.$.odds2":
                  data[i].bookmakers[j].markets[0].outcomes[1].price,
                "games.$.points2":
                  data[i].bookmakers[j].markets[0].outcomes[1].point,
              },
            },
            { upsert: true }
          );
      }
    }
  } catch (e) {
    console.log("Error refreshing spreads:", e);
    throw e;
  }
}

// Refresh totals
export async function refreshTotals(sport) {
  try {
    await connectToDb();
    const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsAPIKey}&regions=us&markets=totals`;
    const response = await fetch(url);
    const data = await response.json();

    for (var i = 0; i < data.length; i++) {
      // Add each game as document to games array
      await client
        .db("jodds")
        .collection("totals")
        .updateOne(
          { sport: sport },
          {
            $push: {
              games: {
                _id: data[i].id,
                team1: data[i].home_team,
                team2: data[i].away_team,
                bookmakers: [],
                oddsOver: [],
                oddsUnder: [],
                pointsOver: [],
                pointsUnder: [],
              },
            },
          },
          { upsert: true }
        );

      // Add bet details of each game
      for (var j = 0; j < data[i].bookmakers.length; j++) {
        await client
          .db("jodds")
          .collection("totals")
          .updateOne(
            { sport: sport, "games._id": data[i].id },
            {
              $push: {
                "games.$.bookmakers": data[i].bookmakers[j].title,
                "games.$.oddsOver":
                  data[i].bookmakers[j].markets[0].outcomes[0].price,
                "games.$.pointsOver":
                  data[i].bookmakers[j].markets[0].outcomes[0].point,
                "games.$.oddsUnder":
                  data[i].bookmakers[j].markets[0].outcomes[1].price,
                "games.$.pointsUnder":
                  data[i].bookmakers[j].markets[0].outcomes[1].point,
              },
            },
            { upsert: true }
          );
      }
    }
  } catch (e) {
    console.log("Error refreshing spreads:", e);
    throw e;
  }
}
