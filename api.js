import axios from "axios";
import {
  findFree,
  createRecord,
  modifyTable,
  setTable,
  setIndexFreeUpdate,
} from "./helpers.js";

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

    console.log("apiModifySubaccountTrue subaccount:", subaccount);
    console.log("apiModifySubaccountTrue data:", response.data);

    // Modify the record in the table (used: false).
    // modifyTable(response.data, false); // NEED TO UPDATE VCR

    // Return true to indicate a successful modification.
    return true;
  } catch (error) {
    console.error(`Subaccount new attributes ERROR: ${error.message}`);

    // Return false to indicate that the modification was not successful.
    return false;
  }
}

/**
 * Updates the API secret for a given API key.
 * @param {string} api_key - The API key to update.
 * @param {string} api_secret - The current API secret.
 * @param {string} new_secret - The new API secret.
 * @returns {Promise<boolean>} - A Promise that resolves to true if successful, false otherwise.
 */
export async function apiCreateApiSecret(
  auth_api_key,
  auth_api_secret,
  api_key,
  new_secret
) {
  try {
    console.log(`Setting password for ${api_key} to ${new_secret}`);

    const url = `https://api.nexmo.com/accounts/${api_key}/secrets`;

    // Make a POST request to update the API secret for the subaccount
    await axios.post(
      url,
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

    // Log a success message after the password has been updated.
    console.log(`Password for ${api_key} updated successfully.`);

    // Return true to indicate a successful password update.
    return true;
  } catch (error) {
    console.error(`Error updating password for ${api_key}: ${error.message}`);

    // Return false to indicate that the password update was not successful.
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

/** OLD /////////////////////////////////////////////////
 * Creates a subaccount in a pool or updates an existing one.
 * @param {string} auth_api_key - The main account's API key.
 * @param {string} auth_api_secret - The main account's API secret.
 * @param {string} name - The name of the subaccount.
 * @param {string} api_secret - The secret for the subaccount.
 * @returns {Promise<object>} - A Promise that resolves with the subaccount data.
 * @throws {Error} - If there's an error during the creation process.
 */
export async function createPool(
  auth_api_key,
  auth_api_secret,
  name,
  new_secret
) {
  try {
    // Find out if the API key is in the pool and if there is a unused subaccount
    const free = await findFree(auth_api_key);
    console.log("createPool > findFree:", free);

    if (free === false || free === undefined) {
      console.log(
        "createPool > apiSignatureSecret called because none free or free is undefined"
      );
      // IF free: false, Create a new subaccount with signature secret and return subaccount object
      return await apiSignatureSecret(
        auth_api_key,
        auth_api_secret,
        name,
        new_secret
      );
    } else {
      // IF free: true, TRY TO Update the password for the free subaccount.
      console.log("apiCreateApiSecret secret:", free.secret);
      const updatedSecret = apiCreateApiSecret(
        auth_api_key,
        auth_api_secret,
        free.api_key,
        new_secret
      );

      // IF Update secret was successfull, THEN
      // Modify the subaccount by updating the "suspended" and "name" properties.
      if (updatedSecret) {
        const modified = await apiModifySubaccount(
          auth_api_key,
          auth_api_secret,
          free.api_key,
          name,
          false
        );
        // apiModifySubaccount data: {
        //   api_key: '',
        //   primary_account_api_key: '',
        //   use_primary_account_balance: true,
        //   name: '',
        //   balance: null,
        //   credit_limit: null,
        //   suspended: false,
        //   created_at: ''
        // }

        console.log("createPool apiModifySubaccount response: ", modified);

        // If modified successfully, set name, suspended: false and update VCR subaccount record
        // Also set the /get-index subaccount to used: true
        if (modified) {
          // GOOD !
          free.name = name;
          free.suspended = false;
          // createRecord(free, true);
          await setTable(free);
          await setIndexFreeUpdate(free, true); // free.used = true
          console.log("createPool RETURN FREE: ", free);
          return free;
        }
      }
    }
  } catch (error) {
    console.error("Error creating subaccount in pool:", error);
    throw error; // Rethrow the error for further handling
  }
}
