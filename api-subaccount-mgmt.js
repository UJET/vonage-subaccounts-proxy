import axios from "axios";
import { vcr } from "@vonage/vcr-sdk";
const state = vcr.getInstanceState();
import {
  findFree,
  createRecord,
  modifyTable,
  setTable,
  setIndex,
  setIndexFreeUpdate,
  validateSecret,
} from "./helpers.js";

import { getFirstSecretId } from "./api-secret-mgmt.js";

/**
 * Retrieve a subaccount's information specified with its API key.
 * @param {string} api_key - The API key.
 * @param {string} api_secret - The API secret.
 * @param {string} subaccount_key - The subaccount key.
 * @returns {Promise<boolean>} - A Promise that resolves to true if successful, false otherwise.
 */
export async function apiRetrieveSubaccount(
  api_key,
  api_secret,
  subaccount_key
) {
  try {
    const urlRetrieveSubaccount = `https://api.nexmo.com/accounts/${api_key}/subaccounts/${subaccount_key}`;

    // Make a GET request to retrieve the subaccount information.
    const response = await axios.get(urlRetrieveSubaccount, {
      auth: {
        username: api_key,
        password: api_secret,
      },
    });

    console.log("apiRetrieveSubaccount data:", response.data);

    // Modify the record in the table.
    // modifyTable(response.data);

    // Return response to indicate a successful retrieval.
    return response.data;
  } catch (error) {
    console.error(`apiRetrieveSubaccount error: ${error.message}`);

    // Return false to indicate that the retrieval was not successful.
    return error.message;
  }
}

/**
 * Creats a NEW Subaccount with a generated signature_secret using the api_key.
 * @param {string} api_key - The API key.
 * @param {string} api_secret - The API secret.
 * @param {string} name - The name of the subaccount.
 * @param {string} secret - The secret for the subaccount.
 * @returns {Promise<Object>} - A Promise that resolves to the response data containing the signature_secret.
 */
export async function apiSignatureSecret(api_key, api_secret, name, secret) {
  try {
    const urlSignatureSecret = `https://api.nexmo.com/accounts/${api_key}/subaccounts?sensitive-data=true`;

    // Make a POST request to creats a NEW Subaccount with a generated signature_secret using the api_key.
    const response = await axios.post(
      urlSignatureSecret,
      {
        api_key,
        name,
        secret,
      },
      {
        auth: {
          username: api_key,
          password: api_secret,
        },
      }
    );

    console.log("apiSignatureSecret:", response.data);

    // Create a record for the response data. Set used: true. Will be added to /get-index VCR data
    // createRecord(response.data, true);
    await setTable(response.data);
    await setIndexFreeUpdate(response.data, true); // free.used = true

    // Return the subaccount object with the signature_secret.
    return response.data;
  } catch (error) {
    console.error(`apiSignatureSecret ERROR: ${error.message}`);

    return error;
  }
}

/**
 * Modifies a subaccount's attributes, setting 'suspended' and 'name' properties.
 * @param {string} api_key - The API key.
 * @param {string} api_secret - The API secret.
 * @param {string} subaccount_key - The subaccount key.
 * @param {string} name - The new name for the subaccount.
 * @param {boolean} suspended - The new suspended status.
 * @returns {Promise<boolean>} - A Promise that resolves to true if successful, false otherwise.
 */
export async function apiModifySubaccount(
  api_key,
  api_secret,
  subaccount_key,
  name,
  suspended,
  subaccount
) {
  try {
    const urlModifySubaccount = `https://api.nexmo.com/accounts/${api_key}/subaccounts/${subaccount_key}`;

    // Make a PATCH request to modify the subaccount.
    const response = await axios.patch(
      urlModifySubaccount,
      {
        suspended,
        name,
      },
      {
        auth: {
          username: api_key,
          password: api_secret,
        },
      }
    );

    // Modify the VCR record table.
    let respondData = response.data;

    console.log("apiModifySubaccount subaccount:", subaccount);
    console.log("apiModifySubaccount data:", response.data);
    // modifyTable(response.data); // NEED TO UPDATE VCR

    // Return true to indicate a successful modification.
    return true;
  } catch (error) {
    console.error(`Subaccount attributes modification error: ${error.message}`);

    // Return false to indicate that the modification was not successful.
    return false;
  }
}

/**
 * Modifies a subaccount's attributes, setting 'suspended' and 'name' properties.
 * @param {string} api_key - The API key.
 * @param {string} api_secret - The API secret.
 * @param {string} subaccount_key - The subaccount key.
 * @param {string} name - The new name for the subaccount.
 * @param {boolean} suspended - The new suspended status true
 * @returns {Promise<boolean>} - A Promise that resolves to true if successful, false otherwise.
 */
export async function apiModifySubaccountTrue(
  api_key,
  api_secret,
  subaccount_key,
  name,
  suspended,
  subaccount
) {
  try {
    const urlModifySubaccount = `https://api.nexmo.com/accounts/${api_key}/subaccounts/${subaccount_key}`;

    // Make a PATCH request to modify the subaccount.
    const response = await axios.patch(
      urlModifySubaccount,
      {
        suspended,
        name,
      },
      {
        auth: {
          username: api_key,
          password: api_secret,
        },
      }
    );

    console.log("apiModifySubaccountTrue subaccount:", subaccount); // VCR HAS SIGNATURE_SECRET
    // ADD SIGNATURE_SECRET TO VCR
    response.data.signature_secret = subaccount.signature_secret;

    // console.log("apiModifySubaccountTrue data:", response.data);

    // Modify the record in the table (used: false).
    modifyTable(response.data, false); // NEED TO UPDATE VCR

    // Return true to indicate a successful modification.
    return response.data;
  } catch (error) {
    console.error(`Subaccount new attributes ERROR: ${error.message}`);

    // Return false to indicate that the modification was not successful.
    return false;
  }
}

/**
 * Creates a subaccount without signature_secret
 * @param {string} auth_api_key - The main account's API key.
 * @param {string} auth_api_secret - The main account's API secret.
 * @param {string} name - The name of the subaccount.
 * @param {string} api_secret - The secret for the subaccount.
 * @returns {Promise<object>} - A Promise that resolves with the created subaccount data.
 * @throws {Error} - If there's an error during the creation process.
 */
export async function apiCreateSubaccount(
  auth_api_key,
  auth_api_secret,
  name,
  api_secret
) {
  const urlCreateSubaccount = `https://api.nexmo.com/accounts/${auth_api_key}/subaccounts`;

  try {
    const response = await axios.post(
      urlCreateSubaccount,
      {
        name: name,
        secret: api_secret,
      },
      {
        auth: {
          username: auth_api_key,
          password: auth_api_secret,
        },
      }
    );

    const subaccountData = response.data;

    console.log("apiCreateSubaccount results:", subaccountData);

    // Create a record for the new subaccount
    createRecord(subaccountData, true);

    return subaccountData;
  } catch (error) {
    console.error("apiCreateSubaccount error:", error);

    if (error.response && error.response.data) {
      console.error("Specific Error:", error.response.data);
    }

    throw error;
  }
}

/**
 * Creates a subaccount in a pool or updates an existing one.
 * @param {string} auth_api_key - The main account's API key.
 * @param {string} auth_api_secret - The main account's API secret.
 * @param {string} new_name - The new name of the subaccount.
 * @param {string} api_secret - The secret for the subaccount.
 * @returns {Promise<object>} - A Promise that resolves with the subaccount data.
 * @throws {Error} - If there's an error during the creation process.
 */
export async function createPool(
  req,
  res,
  auth_api_key,
  auth_api_secret,
  new_name,
  new_secret
) {
  let apiCreateApiSecretResp, apiRetrieveAllSecretsResp, apiRevokeOneSecretResp;
  // Find out if the API key is in the pool and if there is a unused subaccount
  const free = await findFree(auth_api_key);
  console.log("createPool > findFree:", free);

  try {
    if (free === false || free === undefined) {
      console.log(
        "createPool > apiSignatureSecret called because none free or free is undefined"
      );
      // IF free: false, Create a new subaccount with signature secret and return subaccount object
      return await apiSignatureSecret(
        auth_api_key,
        auth_api_secret,
        new_name,
        new_secret
      );
    } else {
      // IF free: true
      // 1. Retrieve, Create and Modify.
      let secretValidation = await validateSecret(new_secret);
      console.log("secretValidation:", secretValidation);
      if (secretValidation !== "valid secret") {
        return res.status(401).json("secret is not valid");
      }

      apiRetrieveAllSecretsResp = await axios.get(
        `https://api.nexmo.com/accounts/${free.api_key}/secrets`,
        {
          auth: {
            username: auth_api_key,
            password: auth_api_secret,
          },
        }
      );
      // console.log("apiRetrieveAllSecretsResp:", apiRetrieveAllSecretsResp.data);

      // 2. Check how many secrets, if 2 then delete first, then create new secret.
      if (apiRetrieveAllSecretsResp.data._embedded.secrets.length === 2) {
        console.log("2 secrets");
        let firstSecretId = await getFirstSecretId(
          apiRetrieveAllSecretsResp.data
        );
        console.log("free.api_key:", free.api_key);
        console.log("firstSecretId:", firstSecretId);

        apiRevokeOneSecretResp = await axios.delete(
          `https://api.nexmo.com/accounts/${free.api_key}/secrets/${lastSecretId}`,
          {
            auth: {
              username: auth_api_key,
              password: auth_api_secret,
            },
          }
        );

        console.log("apiRevokeOneSecretResp:", apiRevokeOneSecretResp.status); // 204
        // if successfully revoked secret, then create new secret. Secret cannot be same as last.
        if (apiRevokeOneSecretResp.status === 204) {
          // create, modify and set VCR used: true
          // go ahead and use new_secreet
          apiCreateApiSecretResp = await axios.post(
            `https://api.nexmo.com/accounts/${free.api_key}/secrets`,
            {
              secret: new_secret,
            },
            {
              auth: {
                username: auth_api_key,
                password: auth_api_secret,
              },
            }
          );

          console.log(
            "apiCreateApiSecretResp.status:",
            apiCreateApiSecretResp.status
          ); // 201
          // if successfully set new secret, then modify
          if (apiCreateApiSecretResp.status === 201) {
            const apiModifySubaccountResp = await axios.patch(
              `https://api.nexmo.com/accounts/${auth_api_key}/subaccounts/${free.api_key}`,
              {
                suspended: free.suspended,
                name: new_name,
              },
              {
                auth: {
                  username: auth_api_key,
                  password: auth_api_secret,
                },
              }
            );

            console.log(
              "apiModifySubaccountResp.status:",
              apiModifySubaccountResp.status
            ); // 200

            if (apiModifySubaccountResp.status === 200) {
              // GOOD !
              free.name = new_name;
              free.suspended = false;
              await setTable(free);
              await setIndexFreeUpdate(free, true); // set free.used = true
              console.log("createPool return free: ", free);
              return res.status(200).json(free);
            }
          }
        }
      } else if (
        apiRetrieveAllSecretsResp.data._embedded.secrets.length === 1
      ) {
        console.log("1 secret");
        // create, modify and set VCR used: true
        // go ahead and use new_secreet
        try {
          apiCreateApiSecretResp = await axios.post(
            `https://api.nexmo.com/accounts/${free.api_key}/secrets`,
            {
              secret: new_secret,
            },
            {
              auth: {
                username: auth_api_key,
                password: auth_api_secret,
              },
            }
          );

          console.log(
            "apiCreateApiSecretResp.status:",
            apiCreateApiSecretResp.status
          ); // 201
        } catch (error) {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(`Error status code: ${error.response.status}`);

            if (error.response.status === 400) {
              console.error("Error details:", error.response.data);
              // you are trying to use the same secret string
              const apiModifySubaccountResp = await axios.patch(
                `https://api.nexmo.com/accounts/${auth_api_key}/subaccounts/${free.api_key}`,
                {
                  suspended: free.suspended,
                  name: new_name,
                },
                {
                  auth: {
                    username: auth_api_key,
                    password: auth_api_secret,
                  },
                }
              );

              console.log(
                "apiModifySubaccountResp.status:",
                apiModifySubaccountResp.status
              ); // 200

              if (apiModifySubaccountResp.status === 200) {
                // GOOD !
                free.name = new_name;
                free.suspended = false;
                await setTable(free);
                await setIndexFreeUpdate(free, true); // set free.used = true
                console.log("createPool return free: ", free);
                return res.status(200).json(free);
              }
            }
            // console.error("Error details:", error.response.data);
            res.status(error.response.status).send(error.response.data);
          } else if (error.request) {
            // The request was made but no response was received
            console.error("No response received:", error.request);
            res.status(500).send("No response received from the server");
          } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Error:", error.message);
            res.status(500).send(error.message);
          }
        }
        // if successfully set new secret, then modify
        if (apiCreateApiSecretResp.status === 201) {
          const apiModifySubaccountResp = await axios.patch(
            `https://api.nexmo.com/accounts/${auth_api_key}/subaccounts/${free.api_key}`,
            {
              suspended: free.suspended,
              name: new_name,
            },
            {
              auth: {
                username: auth_api_key,
                password: auth_api_secret,
              },
            }
          );

          console.log(
            "apiModifySubaccountResp.status:",
            apiModifySubaccountResp.status
          ); // 200

          if (apiModifySubaccountResp.status === 200) {
            // GOOD !
            free.name = new_name;
            free.suspended = false;
            await setTable(free);
            await setIndexFreeUpdate(free, true); // set free.used = true
            console.log("createPool return free: ", free);
            return res.status(200).json(free);
          }
        }
      } else {
        console.log("other secrets");
      }

      apiRetrieveAllSecretsResp = await axios.get(
        `https://api.nexmo.com/accounts/${free.api_key}/secrets`,
        {
          auth: {
            username: auth_api_key,
            password: auth_api_secret,
          },
        }
      );
      if (
        apiRetrieveAllSecretsResp &&
        apiRetrieveAllSecretsResp.data._embedded.secrets.length
      ) {
        console.log(
          "apiRetrieveAllSecretsResp:",
          apiRetrieveAllSecretsResp.data._embedded.secrets.length
        );
      }
    }
  } catch (error) {
    console.error("Error Ping Pong....");
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Error status code: ${error.response.status}`);

      if (error.response.status === 400) {
        console.error("Error details:", error.response.data);
        // when you have 2 secrets and try to create secret with same secret.
        // Error details: {
        //   type: 'https://developer.nexmo.com/api-errors/account/secret-management#validation',
        //   title: 'Bad Request',
        //   detail: 'The request failed due to secret validation errors',
        //   instance: 'a89818c6-589e-4769-9c1b-5d8af258ccf4',
        //   invalid_parameters: [
        //     { name: 'secret', reason: 'Does not meet complexity requirements' }
        //   ]
        // }
      }
      // console.error("Error details:", error.response.data);
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
      res.status(500).send("No response received from the server");
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error:", error.message);
      res.status(500).send(error.message);
    }
  }
}
