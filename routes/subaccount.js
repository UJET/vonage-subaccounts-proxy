import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { vcr } from "@vonage/vcr-sdk";
import {
  getRecord,
  setTable,
  setIndex,
  resetIndex,
  modifyTable,
} from "../vcr-state-mgmt.js";
import {
  apiRetrieveSubaccount,
  apiModifySubaccount,
  createPool,
} from "../api-subaccount-mgmt.js";
import {
  apiRetrieveAllSecretsRevokeOneSecret,
} from "../api-secret-mgmt.js";
const router = express.Router();
const state = vcr.getInstanceState();

router.get("/get-index/:apikey", authenticate, async (req, res) => {
  let response;
  try {
    const { apikey } = req.params;

    if (!apikey) {
      response = `Missing request body apikey: ${apikey}`;
      return res.status(401).json(response);
    }

    const getIndex = await state.get(apikey);

    if (getIndex) {
      console.log(`Retrieved index for apikey: ${apikey}`);
      response = getIndex;
      res.status(200).json(response);
    } else if (getIndex === null) {
      // if subaccounts don't exist for apikey, state object returns null, so we respond with []
      console.log(`Subaccounts don't exist for apikey: ${apikey}`);
      response = [];
      res.status(200).json(response);
    } else {
      console.log(`Something went wrong`);
      response = [];
      res.status(200).json(response);
    }
  } catch (error) {
    response = `Error retrieving index: ${error}`;
    res.status(500).json(response);
  }
});

router.get("/get-subkey/:subkey", authenticate, async (req, res) => {
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

router.post("/set-subkey/:subkey", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const { subkey } = req.params;
    const recordKey = `${auth_api_key}:${subkey}`;
    const getSubkey = await state.get(recordKey);

    let response;
    if (!subkey) {
      response = "Missing subkey!";
      res.status(200).json(response);
    }

    if (getSubkey !== null) {
      response = `recordKey ${recordKey} already exists!`;
      console.log(response);
      res.status(200).json(response);
    } else {
      // ISSUE: NEXMO API DOES NOT RETURN SECRET
      response = await apiRetrieveSubaccount(
        auth_api_key,
        auth_api_secret,
        subkey
      );

      // ADD Subaccount obj and false (suspended) to VCR data.
      let isNew = true;
      await setTable(response, isNew);
      // Flip Boolean
      // IF suspended: true SET used: false;
      // IF suspended: false SET used: true;
      let isSuspended = response.suspended;
      await setIndex(response, !isSuspended);

      res.status(200).json(response);
    }
  } catch (error) {
    console.error(`Error retrieving subkey: ${error.message}`);
    res.status(500).json("Error retrieving subkey");
  }
});

router.post("/reset-subkey/:subkey", authenticate, async (req, res) => {
  try {
    const { auth_api_key, auth_api_secret } = req;
    const { subkey } = req.params;

    let response;
    if (!subkey) {
      response = "Missing subkey!";
      res.status(200).json(response);
    }
    
    const recordKey = `${auth_api_key}:${subkey}`;
    response = await getRecord(recordKey);

    if (response == null) {
      response = `recordKey ${recordKey} doesn't exist!`;
      console.log(response);
      res.status(200).json(response);
    } else {
      await resetIndex(response);
      res.status(200).json(response);
    }
  } catch (error) {
    console.error(`Error retrieving subkey: ${error.message}`);
    res.status(500).json("Error retrieving subkey");
  }
});

// Pass a signature_secret in body and add it to its VCR subaccount object.
router.post("/set-subkey-signature/:subkey", authenticate, async (req, res) => {
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

// GET FREE
router.post("/account/:apikey/subaccounts", authenticate, async (req, res) => {
  console.time("\ncreatePool Total Execution Time");
  const { auth_api_key, auth_api_secret } = req;
  const api_key = req.params.apikey;
  const api_secret = req.body.secret;
  const name = req.body.name;
  try {
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

    console.time("\ngetMainKeys");
    const getMainKeys = await state.get("mainKeys");
    console.timeEnd("\ngetMainKeys");
    const mainKeyInfo = getMainKeys.find(
      (mainKey) => mainKey.apikey === api_key
    );

    if (!mainKeyInfo) {
      console.error("Invalid API Key, not found: ", api_key);
      return res.status(404).json("Invalid API Key, not found");
    }

    let subaccount = null;
    // IF req.params.apikey.pool: true, then
    // find out if the API key is in the pool and if there is a unused subaccount (findFree()) then
    // if free: false, Create a new subaccount with signature secret and return subaccount object then
    // save to VCR subaccount object.

    // ELSE response = apikey in mainkeys require pool: true
    if (mainKeyInfo.pool) {
      subaccount = await createPool(
        req,
        res,
        auth_api_key,
        auth_api_secret,
        name,
        api_secret
      );
      // console.log("subaccount: ", subaccount);
      console.timeEnd("\ncreatePool Total Execution Time");
      return res.status(200).json(subaccount);
    } else {
      let response = "apikey in mainkeys require pool: true";
      return res.status(300).json(response);
    }
  } catch (error) {
    console.log(error);
    res.status(400).json(error);
  }
});

router.delete(
  "/account/:apikey/subaccounts/:subkey",
  authenticate,
  async (req, res) => {
    try {
      console.log("\n", "*".repeat(50));
      console.time("\nDELETE Total Execution Time");
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
      const subaccount = await getRecord(rkey);
      if (subaccount === null) {
        console.error(
          "Invalid API api_key:sub_key: ",
          rkey,
          " - sub_key does not exist"
        );
        return res.status(404).json("Invalid API api_key:sub_key");
      }

      let suspended = true;
      const apiModifySubaccountResp = await apiModifySubaccount(
        auth_api_key,
        auth_api_secret,
        sub_key,
        subaccount.name, // just passing vcr prop, not modifying
        suspended // sets suspended: true, used: false
      );

      // console.log("subaccount:", subaccount); // VCR HAS SIGNATURE_SECRET
      console.log(
        "apiModifySubaccountResp.data:",
        apiModifySubaccountResp.data
      );

      // adding signature_secret & secret to response payload
      apiModifySubaccountResp.data.signature_secret =
        subaccount.signature_secret;
      apiModifySubaccountResp.data.secret = subaccount.secret;

      // setting subaccount's to used: false for /get-index
      modifyTable(apiModifySubaccountResp.data, false);

      // 2 shorten GET FREE response, we will execute apiRetrieveAllSecrets, apiRevokeOneSecret
      try {
        await apiRetrieveAllSecretsRevokeOneSecret(
          auth_api_key,
          auth_api_secret,
          sub_key
        );
      } catch (error) {
        console.error("\napiRetrieveAllSecretsRevokeOneSecret error:", error);
        res.status(500).json("apiRetrieveAllSecretsRevokeOneSecret:", error);
      }

      console.timeEnd("\nDELETE Total Execution Time");
      return res.status(200).json(apiModifySubaccountResp.data);
    } catch (error) {
      console.error(`Error deleting or modifying subaccount: ${error.message}`);
      res.status(500).json("Error deleting or modifying subaccount");
    }
  }
);

export default router;
