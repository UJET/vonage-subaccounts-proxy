import axios from "axios";
import { findFree, createRecord, modifyTable } from "./helpers.js";

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
 * Generates a signature secret for a subaccount.
 * @param {string} api_key - The API key.
 * @param {string} api_secret - The API secret.
 * @param {string} name - The name of the subaccount.
 * @param {string} secret - The secret for the subaccount.
 * @returns {Promise<Object>} - A Promise that resolves to the response data containing the signature secret.
 */
export async function apiSignatureSecret(api_key, api_secret, name, secret) {
  try {
    const urlSignatureSecret = `https://api.nexmo.com/accounts/${api_key}/subaccounts?sensitive-data=true`;

    // Make a POST request to generate the signature secret.
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

    // Log the data received from the API response.
    console.log("apiSignatureSecret:", response.data);

    // Create a record for the response data.
    createRecord(response.data, true);

    // Return the response data containing the signature secret.
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
  suspended
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

    console.log("apiModifySubaccount data:", response.data);

    // Modify the record in the table.
    modifyTable(response.data);

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
 * @param {boolean} suspended - The new suspended status.
 * @returns {Promise<boolean>} - A Promise that resolves to true if successful, false otherwise.
 */
export async function apiModifySubaccountTrue(
  api_key,
  api_secret,
  subaccount_key,
  name,
  suspended
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

    console.log("apiModifySubaccountTrue data:", response.data);

    // Modify the record in the table (used: false).
    modifyTable(response.data, false);

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
export async function apiCreateApiSecret(api_key, api_secret, new_secret) {
  try {
    console.log(`Setting password for ${api_key} to ${new_secret}`);

    const url = `https://api.nexmo.com/accounts/${api_key}/secrets`;

    // Make a POST request to update the API secret.
    await axios.post(
      url,
      {
        secret: new_secret,
      },
      {
        auth: {
          username: api_key,
          password: api_secret,
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
 * Creates a subaccount.
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
 * @param {string} name - The name of the subaccount.
 * @param {string} api_secret - The secret for the subaccount.
 * @returns {Promise<object>} - A Promise that resolves with the subaccount data.
 * @throws {Error} - If there's an error during the creation process.
 */
export async function createPool(
  auth_api_key,
  auth_api_secret,
  name,
  api_secret
) {
  try {
    // Find out if the API key is in the pool and if there is a unused subaccount
    const free = await findFree(auth_api_key);
    console.log("createPool > auth_api_key:", auth_api_key);
    console.log("createPool > findFree:", free);

    if (free === false || free === undefined) {
      console.log(
        "createPool > apiCreateSubaccount called because mainkey in pool && NOT free or free is undefined"
      );
      // Create a new subaccount and return the signature secret
      return await apiSignatureSecret(
        auth_api_key,
        auth_api_secret,
        name,
        api_secret
      );
    } else {
      // Change the password, then mark it used, and return it.
      const pass = apiCreateApiSecret(free.api_key, free.secret, api_secret);

      if (pass) {
        console.log("createPool Password successfully adjusted: ", pass);

        // Modify the subaccount by updating the "suspended" and "name" values
        const suspended = false;
        const updated = await apiModifySubaccount(
          auth_api_key,
          auth_api_secret,
          free.api_key,
          name,
          suspended
        );

        console.log("createPool apiModifySubaccount response: ", updated);

        if (updated) {
          // If successfully updated, set the subaccount details and create a record
          free.name = name;
          free.suspended = false;
          free.used = true;

          createRecord(free, true);
          console.log("createRecord true");
          return free;
        } else {
          // If modification failed, still create a record with used set to false
          console.log("createRecord false");
          createRecord(free, false);
        }
      }
    }
  } catch (error) {
    console.error("Error creating subaccount in pool:", error);
    throw error; // Rethrow the error for further handling
  }
}
