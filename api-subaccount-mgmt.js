import axios from "axios";
import { findFree, modifyRecord } from "./vcr-state-mgmt.js";

import {
  apiCreateSecret,
  apiRetrieveAllSecretsRevokeOneSecret,
  validateSecret,
} from "./api-secret-mgmt.js";

/**
 * Retrieve a subaccount's information specified with its API key.
 * @param {string} api_key - The API key.
 * @param {string} api_secret - The API secret.
 * @param {string} subaccount_key - The subaccount key.
 * @returns {Promise<boolean>} - A Promise that resolves with the subaccount data.
 */
export async function apiRetrieveSubaccount(
  api_key,
  api_secret,
  subaccount_key
) {
  try {
    const urlRetrieveSubaccount = `https://api.nexmo.com/accounts/${api_key}/subaccounts/${subaccount_key}`;

    const response = await axios.get(urlRetrieveSubaccount, {
      auth: {
        username: api_key,
        password: api_secret,
      },
    });

    console.log("apiRetrieveSubaccount data:", response.data);

    return response.data;
  } catch (error) {
    console.error(`apiRetrieveSubaccount error: ${error.message}`);

    return error.message;
  }
}

/**
 * Creats a NEW Subaccount with a generated signature_secret using the api_key.
 * @param {string} api_key - The API key.
 * @param {string} api_secret - The API secret.
 * @param {string} name - The name of the subaccount.
 * @param {string} secret - The secret for the subaccount.
 * @returns {Promise<Object>} - A Promise that resolves with the subaccount data with signature_secret.
 */
export async function apiSignatureSecret(
  auth_api_key,
  auth_api_secret,
  new_name,
  new_secret
) {
  const url = `https://api.nexmo.com/accounts/${auth_api_key}/subaccounts?sensitive-data=true`;

  const apiSignatureSecretResp = await axios.post(
    url,
    {
      auth_api_key,
      name: new_name,
      secret: new_secret,
    },
    {
      auth: {
        username: auth_api_key,
        password: auth_api_secret,
      },
    }
  );

  return apiSignatureSecretResp;
}

/**
 * Modifies a subaccount's attributes, setting 'suspended' and 'name' properties.
 * @param {string} api_key - The API key.
 * @param {string} api_secret - The API secret.
 * @param {string} subaccount_key - The subaccount key.
 * @param {string} name - The new name for the subaccount.
 * @param {boolean} suspended - The new suspended status.
 * @returns {Promise<boolean>} - A Promise that resolves with the subaccount data.
 */
export async function apiModifySubaccount(
  auth_api_key,
  auth_api_secret,
  subaccount_key,
  new_name,
  suspended
) {
  const url = `https://api.nexmo.com/accounts/${auth_api_key}/subaccounts/${subaccount_key}`;

  const response = await axios.patch(
    url,
    {
      suspended,
      name: new_name,
    },
    {
      auth: {
        username: auth_api_key,
        password: auth_api_secret,
      },
    }
  );

  return response;
}

/**
 * Creates a subaccount in a pool or updates an existing one.
 * @param {string} auth_api_key - The main account's API key.
 * @param {string} auth_api_secret - The main account's API secret.
 * @param {string} new_name - The new name of the subaccount.
 * @param {string} new_secret - The new secret for the subaccount.
 * @returns {Promise<object>} - A Promise that resolves with either a new subaccount data or free subaccount data from pool.
 */
export async function createPool(
  req,
  res,
  auth_api_key,
  auth_api_secret,
  new_name,
  new_secret
) {
  let apiSignatureSecretResp,
    apiCreateApiSecretResp,
    apiRetrieveAllSecretsResp,
    apiRevokeOneSecretResp,
    apiModifySubaccountResp;
  // console.time("\nFIND FREE");
  // Find out if the API key is in the pool and if there is a unused subaccount
  const free = await findFree(auth_api_key);
  // console.timeEnd("\nFIND FREE");
  console.log("\n\n", "*".repeat(50), "\ncreatePool > findFree:", free);

  try {
    if (free === false || free === undefined) {
      // IF free: false, Create a new subaccount with signature_secret and return a new subaccount.
      // either returns response with new subaccount or error.
      try {
        console.time("API Call apiSignatureSecret");

        apiSignatureSecretResp = await apiSignatureSecret(
          auth_api_key,
          auth_api_secret,
          new_name,
          new_secret
        );

        console.log("apiSignatureSecretResp:", apiSignatureSecretResp.data);
        console.timeEnd("API Call apiSignatureSecret");

        try {
          console.time("API Call modifyRecord");
          // We grab the free subaccount and modify VCR to show it's in use now.
          let isSuspended = false;
          let isNew = true;
          let isUsed = true;
          let record = await modifyRecord(
            apiSignatureSecretResp.data,
            new_secret,
            new_name,
            isSuspended,
            isNew,
            isUsed
          );
          console.timeEnd("API Call modifyRecord");
          return record;
        } catch (error) {
          console.error("modifyRecord ERROR:", error);
          return error;
        }
      } catch (error) {
        console.log("apiSignatureSecret ERROR");
        if (error.response) {
          console.error(
            `apiSignatureSecret Error status code: ${error.response.status}`
          );
          if (error.response.status === 400) {
            console.error(
              "apiSignatureSecret Error details:",
              error.response.data
            );
          }

          return error.response.data;
        } else if (error.request) {
          // The request was made but no response was received
          console.error(
            "apiSignatureSecret No response received:",
            error.request
          );
          return "apiSignatureSecret No response received from the server";
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error("apiSignatureSecret Error:", error.message);
          return error.message;
        }
      }
    } else {
      // IF free: true then Create Secret and Modify Subaccount
      let secretValidation = await validateSecret(new_secret);
      if (secretValidation !== "valid secret") {
        return "secret is not valid";
      }

      // Try to create a new secret, if 400 response; means we are using same secret, then
      // Catch will modify name and suspended then update VCR to used: true and suspended false.
      try {
        console.time("API Call apiCreateSecret");
        apiCreateApiSecretResp = await apiCreateSecret(
          auth_api_key,
          auth_api_secret,
          free.api_key,
          new_secret
        );

        console.log(
          "apiCreateApiSecretResp.status:",
          apiCreateApiSecretResp.status
        ); // 201
        console.timeEnd("API Call apiCreateSecret");
      } catch (error) {
        console.error(
          `apiCreateApiSecretResp Error: ${error.response.status}`
        );

        if (error.response.status === 400 || error.response.status === 403) {
          // 400 means we are trying to use the same secret for subaccount or not complex enough.
          // 403 "detail": "Account reached maximum number [2] of allowed secrets"
          await apiRetrieveAllSecretsRevokeOneSecret(
            auth_api_key,
            auth_api_secret,
            free.api_key
          );

          apiCreateApiSecretResp = await apiCreateSecret(
            auth_api_key,
            auth_api_secret,
            free.api_key,
            new_secret
          );

          console.log(
            "retried apiCreateApiSecretResp.status:",
            apiCreateApiSecretResp.status
          ); // 201
          console.timeEnd("API Call apiCreateSecret");
        }
      }

      try {
        console.time("API Call apiModifySubaccount 1");
        let suspended = false;
        try {
          apiModifySubaccountResp = await apiModifySubaccount(
            auth_api_key,
            auth_api_secret,
            free.api_key,
            new_name,
            suspended
          );

          console.log(
            "\nATTEMPT 1: apiModifySubaccountResp.status:",
            apiModifySubaccountResp.status
          ); // 200
        } catch (error) {
          if (error.response.status === 403) {
            console.log(
              "Error on 1st attempt to Modify Subaccount. Trying 2rd attempt..."
            );
            const delay = (ms) =>
              new Promise((resolve) => setTimeout(resolve, ms));

            // Add a 1/2-second delay
            await delay(500);

            apiModifySubaccountResp = await apiModifySubaccount(
              auth_api_key,
              auth_api_secret,
              free.api_key,
              new_name,
              suspended
            );
            console.log(
              "\nATTEMPT 2: apiModifySubaccountResp.status:",
              apiModifySubaccountResp.status
            );
            console.log(
              "apiModifySubaccountResp.statusText:",
              apiModifySubaccountResp.statusText
            );
          } else {
            console.log(
              "Other Error on 1nd attempt to Modify Subaccount:",
              error.response.status
            );
          }
        }
        console.timeEnd("API Call apiModifySubaccount 1");

        // We grab the free subaccount and modify VCR to show it's in use now.
        try {
          console.time("VCR modifyRecord");
          let isSuspended = false;
          let isNew = false;
          let isUsed = true;
          let record = await modifyRecord(
            free,
            new_secret,
            new_name,
            isSuspended,
            isNew,
            isUsed
          );
          console.timeEnd("VCR modifyRecord");
          return record;
        } catch (error) {
          console.error("modifyRecord ERROR:", error);
          return error;
        }
      } catch (error) {
        if (error.response) {
          if (error.response.status === 400 || error.response.status === 403) {
            console.time("API Call apiModifySubaccount Catch");
            const delay = (ms) =>
              new Promise((resolve) => setTimeout(resolve, ms));

            // Add a 1/2-second delay
            await delay(500);
            let suspended = false;
            apiModifySubaccountResp = await apiModifySubaccount(
              auth_api_key,
              auth_api_secret,
              free.api_key,
              new_name,
              suspended
            );

            console.log(
              "apiModifySubaccountResp.status:",
              apiModifySubaccountResp.status
            ); // 200
            console.timeEnd("API Call apiModifySubaccount Catch");

            if (apiModifySubaccountResp.status === 200) {
              try {
                console.time("VCR modifyRecord");
                // // We grab the free subaccount and modify VCR to show it's in use now.
                let isSuspended = false;
                let isNew = false;
                let isUsed = true;
                let record = await modifyRecord(
                  free,
                  new_secret,
                  new_name,
                  isSuspended,
                  isNew,
                  isUsed
                );
                console.timeEnd("VCR modifyRecord");
                return record;
              } catch (error) {
                console.error("modifyRecord ERROR:", error);
                return error;
              }
            }
          }

          res.status(error.response.status).send(error.response.data);
        } else if (error.request) {
          console.error(
            "apiModifySubaccountResp No response received:",
            error.request
          );
          return "apiModifySubaccountResp No response received from the server";
        } else {
          console.error("apiModifySubaccountResp Error:", error.message);
          error.message;
        }
      }
    }
  } catch (error) {
    console.error("CreatePool Error...");
    if (error.response) {
      console.error(`CreatePool Error status code: ${error.response.status}`);
      if (error.response.status === 400) {
        console.error("CreatePool Error details:", error.response.data);
      }
      return error.response.data;
    } else if (error.request) {
      console.error("CreatePool No response received:", error.request);
      return "CreatePool No response received from the server";
    } else {
      console.error("CreatePool Error:", error.message);
      return error.message;
    }
  }
}
