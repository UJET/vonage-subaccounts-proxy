import express, { response } from "express";
import dotenv from "dotenv";
import { vcr } from "@vonage/vcr-sdk";
import axios from "axios";
import {
  findFree,
  getTable,
  getRecord,
  deleteRecord,
  getIndex,
  deleteIndex,
  createRecord,
  deleteTable,
} from "./helpers.js";
import {
  apiRetrieveSubaccount,
  apiSignatureSecret,
  apiModifySubaccount,
  apiModifySubaccountTrue,
  apiCreateApiSecret,
  apiCreateSubaccount,
  createPool,
} from "./api.js";

dotenv.config();

// const state = vcr.getAccountState();
const state = vcr.getInstanceState();
const app = express();
const port = process.env.VCR_PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("No auth headers!");
    return res.status(401).json("No auth headers!");
  }

  const [auth_api_key, auth_api_secret] = Buffer.from(
    authHeader.split(" ")[1],
    "base64"
  )
    .toString()
    .split(":");

  if (!auth_api_key || !auth_api_secret) {
    console.log("Invalid Authorization Header!");
    return res.status(401).json("Invalid Authorization Header!");
  }

  req.auth_api_key = auth_api_key;
  req.auth_api_secret = auth_api_secret;

  next();
};

// console.log(`Application Name: ${process.env.INSTANCE_SERVICE_NAME}`);
// console.log(process.env);
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
    .catch((err) => console.log("interval error: ", err));
}, 30000);

app.get("/keep-alive", (req, res) => {
  res.send(`/keep-alive`);
});

app.post("/set-mainkeys", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const mainKeys = req.body;

    if (!mainKeys || !Array.isArray(mainKeys) || mainKeys.length === 0) {
      console.log("Invalid or empty mainKeys array!");
      return res.status(400).json("Invalid or empty mainKeys array!");
    }

    const setMainKeys = await state.set("mainKeys", mainKeys);

    if (setMainKeys) {
      console.log("Main keys set successfully:", setMainKeys);
      res.status(200).json(mainKeys);
    } else {
      console.log("Failed to set main keys.");
      res.status(500).json("Failed to set main keys");
    }
  } catch (error) {
    console.error("Error setting main keys:", error.message);
    res.status(500).json("Error setting main keys");
  }
});

app.get("/get-mainkeys", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const getMainKeys = await state.get("mainKeys");

    if (getMainKeys) {
      console.log("Retrieved main keys:", getMainKeys);
      res.status(200).json(getMainKeys);
    } else {
      console.log("Main keys not found.");
      res.status(404).json("Main keys not found");
    }
  } catch (error) {
    console.error("Error retrieving main keys:", error.message);
    res.status(500).json("Error retrieving main keys");
  }
});

app.get("/get-index/:apikey", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const { apikey } = req.params;

    const getIndex = await state.get(apikey);
    let response;
    if (getIndex) {
      console.log(`Retrieved index for apikey: ${apikey}`);
      response = getIndex;
      res.status(200).json(response);
    } else {
      // if subaccounts don't exist for apikey, state object returns null, so we respond with []
      console.log(`Subaccounts don't exist for apikey: ${apikey}`);
      if (getIndex === null) {
        response = [];
      }
      res.status(404).json(response);
    }
  } catch (error) {
    console.error(`Error retrieving index: ${error}`);
    res.status(500).json("Error retrieving index");
  }
});

app.get("/get-subkey/:subkey", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const { subkey } = req.params;
    const recordKey = `${auth_api_key}:${subkey}`;
    const getSubkey = await state.get(recordKey);
    let response;
    if (getSubkey !== null) {
      console.log(`Retrieved subkey for recordKey: ${recordKey}`);
      res.status(200).json(getSubkey);
    } else {
      response = `Subkey not found for recordKey: ${recordKey}`;
      console.log(response);
      res.status(404).json(response);
    }
  } catch (error) {
    response = `Error retrieving subkey: ${error.message}`;
    console.error(response);
    res.status(500).json(response);
  }
});
app.post("/set-subkey/:subkey", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const { subkey } = req.params;
    const recordKey = `${auth_api_key}:${subkey}`;
    const getSubkey = await state.get(recordKey);

    let response;
    if (getSubkey !== null) {
      response = `recordKey ${recordKey} already exists!`;
      console.log(response);
      res.status(200).json(response);
    } else {
      response = await apiRetrieveSubaccount(
        auth_api_key,
        auth_api_secret,
        subkey
      );
      let record = await createRecord(response, response.suspended);
      res.status(200).json(record);
    }
  } catch (error) {
    console.error(`Error retrieving subkey: ${error.message}`);
    res.status(500).json("Error retrieving subkey");
  }
});

app.post("/set-subkey-signature/:subkey", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const { subkey } = req.params;
    const { signature_secret } = req.body;
    const recordKey = `${auth_api_key}:${subkey}`;
    let getSubkey = await state.get(recordKey);
    let response;

    if (!req.params) {
      return res.status(404).json("no params passed");
    } else if (!subkey) {
      return res.status(404).json("no subkey passed");
    } else if (subkey === "") {
      res.status(404).json("subkey empty.");
    } else if (subkey === ":subkey") {
      res.status(404).json("subkey empty");
    } else if (!signature_secret) {
      response = `signature_secret ${signature_secret} is required!`;
      res.status(404).json(response);
    } else if (getSubkey === null) {
      response = `recordKey ${recordKey} does not exist!`;
      res.status(404).json(response);
    } else {
      getSubkey.signature_secret = signature_secret;
      let setSubkey = await state.set(recordKey, getSubkey);
      let newSubkey = await state.get(recordKey);
      response = `Set recordKey ${recordKey} signature_secret ${setSubkey}!`;
      console.log(response);
      res.status(200).json(newSubkey);
    }
  } catch (error) {
    let response = `Error setting signature_secret for subkey: ${error.message}`;
    console.error(response);
    res.status(500).json(response);
  }
});

// Find Free
app.post("/account/:apikey/subaccounts", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const api_key = req.params.apikey;
    const api_secret = req.body.secret;
    const name = req.body.name;

    let response;
    if (!api_secret || !name) {
      response = `Missing request body api_key: ${api_key} or api_secret: ${api_secret}`;
      return res.status(401).json(response);
    } else if (!api_key) {
      response = `Missing param api_key: ${api_key}`;
      return res.status(401).json(response);
    }

    if (name.length > 80) {
      console.error("Name length exceeds 80");
      return res.status(400).json("Name length exceeds 80");
    }

    const getMainKeys = await state.get("mainKeys");
    const mainKeyInfo = getMainKeys.find(
      (mainKey) => mainKey.apikey === api_key
    );

    if (!mainKeyInfo) {
      console.error("Invalid API Key, not found: ", api_key);
      return res.status(404).json("Invalid API Key, not found");
    }

    let newAccount = null;
    if (mainKeyInfo.pool) {
      console.log("createPool...");
      newAccount = await createPool(
        auth_api_key,
        auth_api_secret,
        name,
        api_secret
      );
    } else {
      console.log("apiCreateSubaccount...");
      newAccount = await apiCreateSubaccount(
        auth_api_key,
        auth_api_secret,
        name,
        api_secret
      );
    }

    const code = newAccount ? 200 : 500;

    console.log("newAccount: ", newAccount);
    return res.status(code).json(newAccount);
  } catch (error) {
    console.error(`Error creating subaccount: ${error.message}`);
    res.status(500).json("Error creating subaccount");
  }
});

app.delete(
  "/account/:apikey/subaccounts/:subkey",
  authenticate,
  async (req, res) => {
    try {
      const { auth_api_key, auth_api_secret } = req;
      const api_key = req.params.apikey;
      const sub_key = req.params.subkey;
      console.log(`DELETE apikey:subkey > ${api_key}:${sub_key}`);

      if (auth_api_key !== api_key || !sub_key || !api_key) {
        console.error("Key/Header Mismatch or Missing Parameters!");
        return res
          .status(401)
          .json("Key/Header Mismatch or Missing Parameters!");
      }

      const getMainKeys = await state.get("mainKeys");
      const key = getMainKeys.find((o) => o.apikey === api_key);

      if (!key || !key.pool) {
        console.error("Invalid API Key or not Pooled: ", api_key);
        return res.status(404).json("Invalid API Key or not Pooled");
      }

      const rkey = `${api_key}:${sub_key}`;
      const sub = await getRecord(rkey);

      if (sub === null) {
        console.error(
          "Invalid API api_key:sub_key: ",
          rkey,
          " - sub_key does not exist"
        );
        return res.status(404).json("Invalid API api_key:sub_key");
      }

      const suspensionResult = await apiModifySubaccountTrue(
        auth_api_key,
        auth_api_secret,
        sub_key,
        sub.name,
        true
      );

      if (!suspensionResult) {
        console.error("Failed to suspend subaccount: ", sub_key);
        return res.status(500).json("Failed to suspend subaccount");
      }

      return res.status(200).json(suspensionResult);
    } catch (error) {
      console.error(`Error deleting subaccount: ${error.message}`);
      res.status(500).json("Error deleting subaccount");
    }
  }
);

app.get("/_/health", (req, res) => {
  res.sendStatus(200);
});

app.get("/_/metrics", (req, res) => {
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  try {
    let hello = "Hello";
    res.status(200).send(`${hello} World`);
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
