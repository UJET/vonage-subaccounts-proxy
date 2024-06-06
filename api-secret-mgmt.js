import axios from "axios";

/**
 * Updates the API secret for a given API key.
 * @param {string} api_key - The API key to update.
 * @param {string} api_secret - The current API secret.
 * @param {string} new_secret - The new API secret.
 * @returns {Promise<boolean>} - A Promise that resolves to true if successful, false otherwise.
 */

export async function apiCreateSecret(
  auth_api_key,
  auth_api_secret,
  api_key,
  new_secret
) {
  const url = `https://api.nexmo.com/accounts/${api_key}/secrets`;

  let response = await axios.post(
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

  return response;
}

export async function apiRetrieveAllSecrets(
  auth_api_key,
  auth_api_secret,
  api_key
) {
  const url = `https://api.nexmo.com/accounts/${api_key}/secrets`;

  let response = await axios.get(url, {
    auth: {
      username: auth_api_key,
      password: auth_api_secret,
    },
  });

  return response;
}

export async function apiRevokeOneSecret(
  auth_api_key,
  auth_api_secret,
  api_key,
  secret_id
) {
  const url = `https://api.nexmo.com/accounts/${api_key}/secrets/${secret_id}`;

  let response = await axios.delete(url, {
    auth: {
      username: auth_api_key,
      password: auth_api_secret,
    },
  });

  return response;
}

export async function getFirstSecretId(data) {
  // Check if _embedded and secrets array exist in the data object
  if (
    data._embedded &&
    data._embedded.secrets &&
    data._embedded.secrets.length > 0
  ) {
    // Get the first secret in the secrets array
    const firstSecret = data._embedded.secrets[0];
    // Return the id of the first secret
    return firstSecret.id;
  }
  // Return null if the secrets array is empty or does not exist
  return null;
}

export async function getLastSecretId(data) {
  // Check if _embedded and secrets array exist in the data object
  if (
    data._embedded &&
    data._embedded.secrets &&
    data._embedded.secrets.length > 0
  ) {
    // Get the last secret in the secrets array
    const lastSecret =
      data._embedded.secrets[data._embedded.secrets.length - 1];
    // Return the id of the last secret
    // console.log("lastSecret.id", lastSecret.id);
    return lastSecret.id;
  }
  // Return null if the secrets array is empty or does not exist
  return null;
}

export function findSecretById(data, id) {
  // Check if _embedded and secrets array exist in the data object
  if (data._embedded && data._embedded.secrets) {
    // Iterate through each secret in the secrets array
    for (let secret of data._embedded.secrets) {
      // Check if the secret's id matches the provided id
      if (secret.id === id) {
        return secret;
      }
    }
  }
  // Return null if no matching secret is found
  return null;
}
