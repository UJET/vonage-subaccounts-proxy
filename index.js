import express from "express";
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
  apiSignatureSecret,
  apiModifySubaccount,
  apiModifySubaccountTrue,
  apiCreateApiSecret,
  apiCreateSubaccount,
  createPool,
} from "./api.js";

dotenv.config();

const state = vcr.getAccountState();
const app = express();
const port = process.env.VCR_PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("No auth headers!");
    return res.status(401).end();
  }

  const [auth_api_key, auth_api_secret] = Buffer.from(
    authHeader.split(" ")[1],
    "base64"
  )
    .toString()
    .split(":");

  if (!auth_api_key || !auth_api_secret) {
    console.log("Invalid Authorization Header!");
    return res.status(401).end();
  }

  req.auth_api_key = auth_api_key;
  req.auth_api_secret = auth_api_secret;

  next();
};

app.post("/set-mainkeys", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const mainKeys = req.body;

    if (!mainKeys || !Array.isArray(mainKeys) || mainKeys.length === 0) {
      console.log("Invalid or empty mainKeys array!");
      return res.status(400).end();
    }

    const setMainKeys = await state.set("mainKeys", mainKeys);

    if (setMainKeys) {
      console.log("Main keys set successfully:", setMainKeys);
      res.status(200).json(mainKeys);
    } else {
      console.log("Failed to set main keys.");
      res.status(500).end();
    }
  } catch (error) {
    console.error("Error setting main keys:", error.message);
    res.status(500).end();
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
      res.status(404).end();
    }
  } catch (error) {
    console.error("Error retrieving main keys:", error.message);
    res.status(500).end();
  }
});

app.get("/get-index/:apikey", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const { apikey } = req.params;

    const getIndex = await state.get(apikey);

    if (getIndex) {
      console.log(`Retrieved index for apikey: ${apikey}`);
      res.status(200).json(getIndex);
    } else {
      console.log(`Index not found for apikey: ${apikey}`);
      res.status(404).end();
    }
  } catch (error) {
    console.error(`Error retrieving index: ${error.message}`);
    res.status(500).end();
  }
});

app.get("/get-subkey/:subkey", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const { subkey } = req.params;
    const recordKey = `${auth_api_key}:${subkey}`;
    const getSubkey = await state.get(recordKey);

    if (getSubkey !== null) {
      console.log(`Retrieved subkey for recordKey: ${recordKey}`);
      res.status(200).json(getSubkey);
    } else {
      console.log(`Subkey not found for recordKey: ${recordKey}`);
      res.status(404).end();
    }
  } catch (error) {
    console.error(`Error retrieving subkey: ${error.message}`);
    res.status(500).end();
  }
});

app.post("/account/:apikey/subaccounts", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const api_key = req.params.apikey;
    const api_secret = req.body.secret;
    const name = req.body.name;

    if (auth_api_key !== api_key || !api_secret || !name) {
      console.error("Key/Header Mismatch or Missing Parameters!");
      return res.status(401).end();
    }

    if (name.length > 80) {
      console.error("Name length exceeds 80");
      return res.status(400).send("Name length exceeds 80");
    }

    const getMainKeys = await state.get("mainKeys");
    const mainKeyInfo = getMainKeys.find(
      (mainKey) => mainKey.apikey === api_key
    );

    if (!mainKeyInfo) {
      console.error("Invalid API Key, not found: ", api_key);
      return res.status(404).end();
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
    res.status(500).end();
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

      if (auth_api_key !== api_key || !sub_key || !api_key) {
        console.error("Key/Header Mismatch or Missing Parameters!");
        return res.status(401).end();
      }

      const getMainKeys = await state.get("mainKeys");
      const key = getMainKeys.find((o) => o.apikey === api_key);

      if (!key || !key.pool) {
        console.error("Invalid API Key or not Pooled: ", api_key);
        return res.status(404).end();
      }

      const rkey = `${api_key}:${sub_key}`;
      const sub = await getRecord(rkey);

      if (sub === null) {
        console.error("Invalid API sub_key: ", rkey);
        return res.status(404).end();
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
        return res.status(500).end();
      }

      return res.status(200).json(suspensionResult);
    } catch (error) {
      console.error(`Error deleting subaccount: ${error.message}`);
      res.status(500).end();
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
    console.log(req.query);
    res.status(200).send("Hello World!");
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
