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
    const apiSignatureSecretResp = await axios.post(
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

    console.log("apiSignatureSecretResp:", apiSignatureSecretResp.data);
    //   {
    //     "api_key": "",
    //     "secret": "",
    //     "primary_account_api_key": "",
    //     "use_primary_account_balance": true,
    //     "name": "",
    //     "balance": null,
    //     "credit_limit": null,
    //     "suspended": false,
    //     "created_at": "",
    //     "signature_secret": ""
    // }

    // UPDATES /get-subkey
    let isNew = true;
    await setTable(apiSignatureSecretResp.data, isNew);
    // UPDATES /get-index
    let isUsed = true;
    await setIndexFreeUpdate(apiSignatureSecretResp.data, isUsed); // free.used = true

    // Return the subaccount object with the signature_secret to GET FREE.
    return apiSignatureSecretResp.data;
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
    response.data.secret = subaccount.secret;

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
 * @param {string} new_secret - The new secret for the subaccount.
 * @returns {Promise<object>} - A Promise that resolves with the subaccount data.
 */
export async function createPool(
  req,
  res,
  auth_api_key,
  auth_api_secret,
  new_name,
  new_secret
) {
  let apiCreateApiSecretResp,
    apiRetrieveAllSecretsResp,
    apiRevokeOneSecretResp,
    apiModifySubaccountResp;
  // Find out if the API key is in the pool and if there is a unused subaccount
  const free = await findFree(auth_api_key);
  console.log("\n\n", "*".repeat(50), "\ncreatePool > findFree:", free);

  try {
    if (free === false || free === undefined) {
      // IF free: false, Create a new subaccount with signature_secret and return a new subaccount.
      // either returns response with new subaccount or error.
      try {
        return await apiSignatureSecret(
          auth_api_key,
          auth_api_secret,
          new_name,
          new_secret
        );
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

          res.status(error.response.status).send(error.response.data);
        } else if (error.request) {
          // The request was made but no response was received
          console.error(
            "apiSignatureSecret No response received:",
            error.request
          );
          res
            .status(500)
            .send("apiSignatureSecret No response received from the server");
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error("apiSignatureSecret Error:", error.message);
          res.status(500).send(error.message);
        }
      }
    } else {
      // IF free: true
      // Retrieve, Create and Modify.
      let secretValidation = await validateSecret(new_secret);
      console.log("secretValidation:", secretValidation);
      if (secretValidation !== "valid secret") {
        return res.status(401).json("secret is not valid");
      }

      // apiRetrieveAllSecretsResp: either returns all secrets or error.
      try {
        apiRetrieveAllSecretsResp = await axios.get(
          `https://api.nexmo.com/accounts/${free.api_key}/secrets`,
          {
            auth: {
              username: auth_api_key,
              password: auth_api_secret,
            },
          }
        );
        console.log(
          "apiRetrieveAllSecretsResp:",
          apiRetrieveAllSecretsResp.data
        );
      } catch (error) {
        console.log("apiRetrieveAllSecretsResp ERROR:", error);
        if (error.response) {
          console.error(`Error status code: ${error.response.status}`);
          if (error.response.status === 400) {
            console.error("Error details:", error.response.data);
          }

          return res.status(error.response.status).send(error.response.data);
        } else if (error.request) {
          console.error(
            "apiRetrieveAllSecretsResp No response received:",
            error.request
          );
          return res
            .status(500)
            .send(
              "apiRetrieveAllSecretsResp No response received from the server"
            );
        } else {
          console.error("apiRetrieveAllSecretsResp error:", error.message);
          return res.status(500).send(error.message);
        }
      }

      // Check how many secrets, if 2 then delete first, create new secret, then modify subaccount to suspended: false.
      if (apiRetrieveAllSecretsResp.data._embedded.secrets.length === 2) {
        console.log("\n\n2 secrets");
        let firstSecretId = await getFirstSecretId(
          apiRetrieveAllSecretsResp.data
        );
        console.log("free.api_key:", free.api_key);
        console.log("firstSecretId:", firstSecretId);

        // If 2 secrets exists, then revoke first one via apiRevokeOneSecretResp
        try {
          apiRevokeOneSecretResp = await axios.delete(
            `https://api.nexmo.com/accounts/${free.api_key}/secrets/${firstSecretId}`,
            {
              auth: {
                username: auth_api_key,
                password: auth_api_secret,
              },
            }
          );

          console.log("apiRevokeOneSecretResp:", apiRevokeOneSecretResp.status); // 204
        } catch (error) {
          console.log("apiRevokeOneSecretResp ERROR:", error);
          if (error.response) {
            console.error(`Error status code: ${error.response.status}`);
            if (error.response.status === 400) {
              console.error("Error details:", error.response.data);
            }

            return res.status(error.response.status).send(error.response.data);
          } else if (error.request) {
            console.error(
              "apiRevokeOneSecretResp No response received:",
              error.request
            );
            return res
              .status(500)
              .send(
                "apiRevokeOneSecretResp No response received from the server"
              );
          } else {
            console.error("apiRevokeOneSecretResp error:", error.message);
            return res.status(500).send(error.message);
          }
        }
        // if successfully revoked a secret, then try to create new secret (secret cannot be same as last),
        // then modify subaccount to suspended: false and set VCR used: true
        if (apiRevokeOneSecretResp.status === 204) {
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
              console.error(`Error status code: ${error.response.status}`);
              if (error.response.status === 400) {
                // if we weren't able to revoke secret, then it must be the same.
                // Just modify suspended: false so we can use it.
                console.error("Error details:", error.response.data);
                apiModifySubaccountResp = await axios.patch(
                  `https://api.nexmo.com/accounts/${auth_api_key}/subaccounts/${free.api_key}`,
                  {
                    suspended: false,
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

                // if we successfully set modified subaccount name & suspended (used: true), then update VCR.
                if (apiModifySubaccountResp.status === 200) {
                  // We grab the free subaccount and modify VCR to show it's in use now.
                  free.secret = new_secret;
                  free.name = new_name;
                  free.suspended = false;
                  let isNew = false;
                  // updates record for subaccount /get-subaccount
                  await setTable(free, isNew);
                  // updates mainkey /get-index
                  await setIndexFreeUpdate(free, true); // set free.used = true
                  console.log("createPool return free: ", free);
                  return free;
                }
              }
              // console.error("Error details:", error.response.data);
              res.status(error.response.status).send(error.response.data);
            } else if (error.request) {
              console.error("No response received:", error.request);
              res.status(500).send("No response received from the server");
            } else {
              console.error("Error:", error.message);
              res.status(500).send(error.message);
            }
          }
          // if successfully set new secret, then modify subaccount name and suspended: false so we can use it.
          if (apiCreateApiSecretResp.status === 201) {
            try {
              apiModifySubaccountResp = await axios.patch(
                `https://api.nexmo.com/accounts/${auth_api_key}/subaccounts/${free.api_key}`,
                {
                  suspended: false,
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
            } catch (error) {
              console.log("apiModifySubaccountResp ERROR:", error);
              if (error.response) {
                console.error(`Error status code: ${error.response.status}`);
                if (error.response.status === 400) {
                  console.error("Error details:", error.response.data);
                }

                return res
                  .status(error.response.status)
                  .send(error.response.data);
              } else if (error.request) {
                console.error(
                  "apiModifySubaccountResp No response received:",
                  error.request
                );
                return res
                  .status(500)
                  .send(
                    "apiModifySubaccountResp No response received from the server"
                  );
              } else {
                console.error("apiModifySubaccountResp error:", error.message);
                return res.status(500).send(error.message);
              }
            }

            if (apiModifySubaccountResp.status === 200) {
              // We grab the free subaccount and modify VCR to show it's in use now.
              free.secret = new_secret;
              free.name = new_name;
              free.suspended = false;
              let isNew = false;
              // updates record for subaccount /get-subaccount
              await setTable(free, isNew);
              // updates mainkey /get-index
              await setIndexFreeUpdate(free, true); // set free.used = true
              console.log("createPool return free: ", free);
              return free;
            }
          }
        }
      } else if (
        apiRetrieveAllSecretsResp.data._embedded.secrets.length === 1
      ) {
        console.log("\n\n1 secret");
        // Try to create a new secret, if 400 response; means we are using same secret, then
        // Catch will modify name and suspended then update VCR to used: true and suspended false.
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
            console.error(`Error status code: ${error.response.status}`);

            if (error.response.status === 400) {
              console.error("Error details:", error.response.data);
              // 400 means we are trying to use the same secret for subaccount.
              apiModifySubaccountResp = await axios.patch(
                `https://api.nexmo.com/accounts/${auth_api_key}/subaccounts/${free.api_key}`,
                {
                  suspended: false,
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
                // We grab the free subaccount and modify VCR to show it's in use now.
                free.secret = new_secret;
                free.name = new_name;
                free.suspended = false;
                let isNew = false;
                // updates record for subaccount /get-subaccount
                await setTable(free, isNew); // set suspended: false
                // updates mainkey /get-index
                await setIndexFreeUpdate(free, true); // set free.used = true
                console.log("createPool return free: ", free);
                return free;
              }
            }
            // console.error("Error details:", error.response.data);
            res.status(error.response.status).send(error.response.data);
          } else if (error.request) {
            console.error("No response received:", error.request);
            res.status(500).send("No response received from the server");
          } else {
            console.error("Error:", error.message);
            res.status(500).send(error.message);
          }
        }
        // if successfully set new secret, then modify
        if (apiCreateApiSecretResp.status === 201) {
          const apiModifySubaccountResp = await axios.patch(
            `https://api.nexmo.com/accounts/${auth_api_key}/subaccounts/${free.api_key}`,
            {
              suspended: false,
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
            free.secret = new_secret;
            free.name = new_name;
            free.suspended = false;
            await setTable(free);
            await setIndexFreeUpdate(free, true); // set free.used = true
            console.log("createPool return free: ", free);
            return free;
          }
        }
      } else {
        console.log("\n\nother secrets");
      }
    }
  } catch (error) {
    console.error("CreatePool Error...");
    if (error.response) {
      console.error(`CreatePool Error status code: ${error.response.status}`);
      if (error.response.status === 400) {
        console.error("CreatePool Error details:", error.response.data);
      }
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      console.error("CreatePool No response received:", error.request);
      res.status(500).send("CreatePool No response received from the server");
    } else {
      console.error("CreatePool Error:", error.message);
      res.status(500).send(error.message);
    }
  }
}
