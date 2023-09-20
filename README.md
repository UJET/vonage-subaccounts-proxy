# Vonage Subaccounts API Management Proxy

This project provides a Node.js-based server for managing subaccounts in the Vonage Subaccounts API. It offers a set of API endpoints to create, modify, and delete subaccounts (suspend: true), as well as manage their attributes.

## Proxy Logic

If apikey is not one of the mainkeys, then proxy request to Create Sub Account API and return newly created subaccount data (as returned in Create Sub Account response).

If apikey is one of the mainkeys:

- If there is any free subaccount (suspended: true and used: false) in Pool (mainkey pool Index)

  - return that subaccount info (same as response from as Create Sub Account API returns).
  - Update the subaccount via Subaccount Modify API to suspended: false and also set that main apikey's subaccount apikey to used: true (see Postman Request GET get-index)

- If there are no free subaccounts in the Pool (mainkey pool Index):
  - Create new subaccount with Create Subaccount Signature Secret API
  - Add it to the Pool (mainkey pool Index) and set that main apikey's subaccount apikey to used: true (see Postman Request GET get-index)
  - Return that subaccount info which also includes signature_secret.

## Features

- **Create Subaccounts**: The server allows for the creation of subaccounts with specified names and secrets.

- **Modify Subaccount Attributes**: It provides functionality to update subaccount attributes such as name and suspended status.

- **Generate Signature Secrets**: The server can generate signature secrets for subaccounts, providing enhanced security.

- **Pool Management**: Subaccounts can be managed in a pool, allowing for efficient utilization and modification of existing subaccounts.

- **Add Subaccount Signature Secret to the VCR Subaccount Record**: It provides functionality to add subaccount signature_secret attribute.

## Files

### `index.js`

This is the main server file responsible for handling HTTP requests and responses.

### `helpers.js`

Contains utility functions for managing data and making API calls via [Vonage Cloud Runtime](https://developer.vonage.com/en/vcr/overview?source=vcr) State Functions.

### `api.js`

Handles API interactions with the Vonage Subaccounts API.

## Routes

### `POST /set-mainkeys`

Sets the main keys required for authentication. Expects JSON payload with main keys.

### `GET /get-mainkeys`

Retrieves the main keys used for authentication.

### `GET /get-index/:apikey`

Retrieves information for a specific subaccount based on the provided API key.

### `GET /get-subkey/:subkey`

Retrieves information for a specific subaccount based on the provided subkey.

### `POST /set-subkey/:subkey`

Retrieves information for a specific subaccount based on the provided subkey and then creates a VCR subaccount record for it.

### `POST /set-subkey-signature/:subkey`

Retrieves information for a specific subaccount based on the provided subkey and then adds the signature_secret to the VCR subaccount record.

### `POST /account/:apikey/subaccounts`

Creates a new subaccount under the provided API key. Expects JSON payload with name and secret.

### `DELETE /account/:apikey/subaccounts/:subkey`

Deletes a subaccount (suspend: true) under the provided API key and subkey while also freeing up the VCR subaccount record (used: false).

> Upon Request to DELETE route `/account/:apikey/subaccounts/:subkey`, if the subaccount does not exist in the VCR State: Then you need to manually add it via route `set-subkey`.

## API Calls

### `apiSignatureSecret(auth_api_key, auth_api_secret, name, secret)`

Generates a signature secret for a new subaccount.

### `apiModifySubaccount(auth_api_key, auth_api_secret, api_key, name, secret)`

Modifies an existing subaccount's properties.

### `apiModifySubaccountTrue(auth_api_key, auth_api_secret, api_key, name, secret)`

Sets a subaccount to "suspended".

### `apiCreateApiSecret(auth_api_key, auth_api_secret, api_key)`

Creates a new API secret.

### `apiCreateSubaccount(auth_api_key, auth_api_secret, name, secret)`

Creates a new subaccount.

## Installation

Enable Vonage Cloud Runtime (VCR) for your Vonage Dashboard

Go to the [VCR online IDE](https://developer.vonage.com/en/cloud-runtime/workspaces). Make sure you are Signed in.

Click on Create Workspace. Import the public GitHub repository `https://github.com/nexmo-se/vonage-subaccounts-proxy.git`. Enter a workspace name e.g. vonage-subaccounts-proxy.

The VCR IDE should now be loaded and a newly created Vonage Application will appear at the Vonage Dashboard Applications with the same name. To connect the Vonage Application we will run the following commands. Just like VS Code, you can drag the hidden terminal below to view it. Run the following commands:

```js
// At the IDE Terminal, we will update the VCR version. If an update exists, opt for yes
neru version
// Initialize the project via
neru init
// enter a project name, usally the same name as previously. eg. vonage-subaccounts-proxy
// Select the Vonage App with the same name. Node16 and select the closest region to you.
// e.g. AWS - US Virginia - (aws.use1) and then any Instance Name e.g. ide and Skip the Template generation since we have have our own source code already.
```

Now at the root directory you will notice that a `neru.yml` file was generated. Currently, there is a bug and we will need to add the lines below. Please see the sample file `neru-sample.yml` as a reference.

```js
entrypoint: [node, index.js];
debug: name: debug;
entrypoint: [nodemon, --inspect, index.js];
```

Your `neru.yml` should look similiar to.

```js
project:
    name: vonage-subaccounts-proxy
instance:
    name: ide
    runtime: nodejs16
    region: aws.use1
    application-id: abcd-abcd-abcd-abcd
    entrypoint: [node, index.js]
debug:
  name: debug
  entrypoint: [nodemon, --inspect, index.js]
```

```js
npm install
// This is for development purposes and allows us to run the NodeJS ExpressJS server and make it public.
vcr debug
// To deploy it permanently, I've shared that instruction below. We do that via vcr deploy.
```

You will notice in the terminal your VCR Instance URL. Copy this and we'll use it below.

```js
// VCR_URL example
Application Host: https://neru-APIKEY-debug-INSTANCE_NAME.REGION.runtime.vonage.cloud
```

## Running the Proxy Demo

To test the VCR routes, I've included a Postman Collection for you to import into Postman. The file is `vonage-subaccounts-proxy.postman_collection.json`.

Update the Postman Collection Variables {VCR_URL, SUBKEY, NAME, SECRET, APIKEY}. The VCR_URL is the URL of your VCR Instance you got when you ran `vcr debug`.

Update the Postman Collection Authorization, so that all the collection requests will inherit the Basic Auth.

Use the Postman requests to set your mainkeys via POST set-mainkey and GET get-mainkeys to see them.

```js
// At Postman Request POST set-mainkey, set your Main API Keys for the accounts you want to use to "pool": true
[
  {
    name: "Google OEM Demo (current)",
    apikey: "AAAAA",
    pool: true,
    max: 10000,
  },
  {
    name: "Google OEM Demo (next)",
    apikey: "BBBBB",
    pool: true,
    max: 10000,
  },
  {
    name: "Other",
    apikey: "CCCCC",
    pool: false,
    max: 10000,
  },
];
```

To get a free subaccount, you make a request via GET FREE.

```js
// Response if there isn't a free subaccount, then it will create one and return it's info with a signature_secret.
{
  "secret": "secret",
  "api_key": "aaaaa",
  "name": "Subaccount department A",
  "primary_account_api_key": "AAAAA",
  "use_primary_account_balance": true,
  "created_at": "2018-03-02T16:34:49Z",
  "suspended": false,
  "balance": 100.25,
  "credit_limit": -100.25,
  "signature_secret": ""
}
```

> The current VCR app will only store the new subaccounts created, it does not currently hold the existing subaccounts you had created previously.

To suspend a subaccount use the DEL DELETE. This will then make it available when the GET FREE request is called.

There are some additional Postman Requests I've created for you to Retrieve the subaccount's info which is via GET get-subkey.

You can view all the subaccount keys via GET get-index by passing the master apikey.

```js
// Postman Request for GET get-index by passing the master apikey (primary_account_api_key) "AAAAA".
// Ex. This would be the Index list of all subaccounts for primary_account_api_key: "AAAAA".
// When making a Postman Request DEL DELETE route {{VCR_URL}}/account/:apikey/subaccounts/:subkey, it will set suspended: true and used: false, which makes it Free.
[
  {
    api_key: "aaaaa",
    used: true,
  },
  {
    api_key: "bbbbb",
    used: true,
  },
  {
    api_key: "ccccc",
    used: false,
  },
];
```

You can also view a subaccounts info via Postman Request GET get-subkey

```js
// Response for Postman Request GET get-subkey
{
  "secret": "secret",
  "api_key": "aaaaa",
  "name": "Subaccount department A",
  "primary_account_api_key": "AAAAA",
  "use_primary_account_balance": true,
  "created_at": "2018-03-02T16:34:49Z",
  "suspended": false,
  "balance": 100.25,
  "credit_limit": -100.25,
  "signature_secret": ""
}
```

## Deploying the Proxy

```js
// Once deployed, you will receive a HOST2 URL, which is what you'll need to update your Postman Variable VCR_URL
vcr deploy
```
