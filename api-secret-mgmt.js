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

// Used by DELETE route
export async function apiRetrieveAllSecretsRevokeOneSecret(
  auth_api_key,
  auth_api_secret,
  sub_key
) {
  try {
    console.time("API Call apiRetrieveAllSecrets");
    let apiRetrieveAllSecretsResp = await apiRetrieveAllSecrets(
      auth_api_key,
      auth_api_secret,
      sub_key
    );

    console.log("apiRetrieveAllSecretsResp:", apiRetrieveAllSecretsResp.data);
    console.timeEnd("API Call apiRetrieveAllSecrets");

    // Check how many secrets, if 2 then delete first, create new secret, then modify subaccount to suspended: false.
    if (apiRetrieveAllSecretsResp.data._embedded.secrets.length === 2) {
      console.log("\n\n2 secrets");
      console.time("\ngetFirstSecretId");
      let firstSecretId = await getFirstSecretId(
        apiRetrieveAllSecretsResp.data
      );
      console.timeEnd("\ngetFirstSecretId");
      console.log("firstSecretId:", firstSecretId);

      // If 2 secrets exists, then revoke first one via apiRevokeOneSecretResp
      try {
        console.time("API Call apiRevokeOneSecret");
        let apiRevokeOneSecretResp = await apiRevokeOneSecret(
          auth_api_key,
          auth_api_secret,
          sub_key,
          firstSecretId
        );

        console.log(
          "apiRevokeOneSecretResp.status:",
          apiRevokeOneSecretResp.status
        ); // 204
        console.timeEnd("API Call apiRevokeOneSecret");
        return apiRevokeOneSecretResp;
      } catch (error) {
        console.log("apiRevokeOneSecretResp ERROR:", error);
        if (error.response) {
          console.error(
            `apiRevokeOneSecretResp Error status code: ${error.response.status}`
          );
          if (error.response.status === 400) {
            console.error(
              "apiRevokeOneSecretResp Error details:",
              error.response.data
            );
          }

          return error.response.data;
        } else if (error.request) {
          console.error(
            "apiRevokeOneSecretResp No response received:",
            error.request
          );
          return "apiRevokeOneSecretResp No response received from the server";
        } else {
          console.error("apiRevokeOneSecretResp error:", error.message);
          return error.message;
        }
      }
    } else if (apiRetrieveAllSecretsResp.data._embedded.secrets.length === 1) {
      console.log("\n\n1 secret");
      return;
    } else {
      console.log("\n\nother secrets");
      return;
    }
  } catch (error) {
    console.log("apiRetrieveAllSecretsResp ERROR:", error);
    if (error.response) {
      console.error(
        `apiRetrieveAllSecretsResp Error status code: ${error.response.status}`
      );
      if (error.response.status === 400) {
        console.error(
          "apiRetrieveAllSecretsResp Error details:",
          error.response.data
        );
      }

      return error.response.data;
    } else if (error.request) {
      console.error(
        "apiRetrieveAllSecretsResp No response received:",
        error.request
      );
      return "apiRetrieveAllSecretsResp No response received from the server";
    } else {
      console.error("apiRetrieveAllSecretsResp error:", error.message);
      return error.message;
    }
  }
}

export async function validateSecret(secret) {
  const errors = [];

  // Check length
  if (secret.length < 8) {
    errors.push("The secret must be at least 8 characters long.");
  }
  if (secret.length > 25) {
    errors.push("The secret must be no more than 25 characters long.");
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(secret)) {
    errors.push("The secret must contain at least one lowercase letter.");
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(secret)) {
    errors.push("The secret must contain at least one uppercase letter.");
  }

  // Check for at least one digit
  if (!/\d/.test(secret)) {
    errors.push("The secret must contain at least one digit.");
  }

  if (errors.length > 0) {
    return errors.join(" ");
  } else {
    return "valid secret";
  }
}
