import express from "express";
import dotenv from "dotenv";
import axios from "axios";

import mainKeyRoutes from "./routes/main-keys.js";
import subaccountRoutes from "./routes/subaccount.js";

dotenv.config();

const app = express();
const port = process.env.VCR_PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", mainKeyRoutes);
app.use("/", subaccountRoutes);

let region = process.env.REGION;
let modifiedRegion = region.replace(/^aws\./, "");
// Every 30 seconds a request is made to prevent inactivity hibernation of 1 minute, which causes cold start.
let interval = setInterval(() => {
  axios
    .get(
      `http://${process.env.INSTANCE_SERVICE_NAME}.${modifiedRegion}.runtime.vonage.cloud/keep-alive`
    )
    .then((resp) => {
      console.log(resp.data);
    })
    .catch((err) => console.log("VCR interval error:", err.code));
}, 30000);

app.get("/keep-alive", (req, res) => {
  res.send(`/keep-alive`);
});

app.get("/_/health", (req, res) => {
  res.sendStatus(200);
});

app.get("/_/metrics", (req, res) => {
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  try {
    res.status(200).send("VCR Proxy is running!");
  } catch (error) {
    console.error(`Error handling request: ${error.message}`);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, (error) => {
  if (error) {
    console.error(`Error starting the server: ${error.message}`);
  } else {
    console.log(`App is now listening on port ${port}`);
  }
});
