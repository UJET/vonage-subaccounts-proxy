import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { vcr } from "@vonage/vcr-sdk";
import {
  getRecord,
  setTable,
  setIndex,
  modifyTable,
} from "../vcr-state-mgmt.js";

const router = express.Router();
const state = vcr.getInstanceState();

// Pass an array of obects that contain main api keys to be used to generate subaccounts.
// "pool": true means it will be used.
// The mainkeys array will be stored in VCR records, but only persistant in VCR deploy.
router.post("/set-mainkeys", authenticate, async (req, res) => {
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

// Retrieve the VCR record for the array of objects of the main api keys to be used for subaccounts.
router.get("/get-mainkeys", authenticate, async (req, res) => {
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

export default router;
