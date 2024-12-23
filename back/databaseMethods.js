import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// dotenv setup
dotenv.config();
const oddsAPIKey = process.env.ODDSAPI_KEY;
const dbUrl = process.env.DB_URL;

// Server setup
const PORT = 3000;
const app = express();

// Mongo setup
const uri = dbUrl;
const client = new MongoClient(uri);

// server start
async function startServer() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/`);
    });
  } catch (e) {
    console.error("Failed to connect to MongoDB", e);
  }
}

// Reset databases
app.get("/resetDatabase", async (req, res) => {
  client
    .db("jodds")
    .collection("h2h")
    .updateOne(
      { sport: "NBA" },
      {
        $set: {
          games: [],
        },
      }
    );
  res.send("done");
});

// Refresh NBA h2h games
app.get("/refreshNBAh2h", async (req, res) => {
  const url = `https://api.the-odds-api.com/v4/sports/basketball_nba/odds/?apiKey=${oddsAPIKey}&regions=us&markets=h2h`;
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
        { sport: "NBA" },
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
        }
      );

    // Add bet details of each game
    for (var j = 0; j < data[i].bookmakers.length; j++) {
      await client
        .db("jodds")
        .collection("h2h")
        .updateOne(
          { sport: "NBA", "games._id": data[i].id },
          {
            $push: {
              "games.$.bookmakers": data[i].bookmakers[j].title,
              "games.$.odds1":
                data[i].bookmakers[j].markets[0].outcomes[0].price,
              "games.$.odds2":
                data[i].bookmakers[j].markets[0].outcomes[1].price,
            },
          }
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
          { sport: "NBA", "games._id": data[i].id },
          {
            $set: {
              "games.$.bestOdds1": bestOdds1,
              "games.$.bestBookmaker1": bestBookmaker1,
              "games.$.bestOdds2": bestOdds2,
              "games.$.bestBookmaker2": bestBookmaker2,
            },
          }
        );
    }
  }
  res.json(data);
});

// Start the server
startServer();
