import { vcr } from "@vonage/vcr-sdk";
const state = vcr.getInstanceState();

export async function findFree(primary_account_api_key) {
  try {
    const currentState = await state.get(primary_account_api_key);

    if (!currentState) {
      console.log("findFree: Primary account not found");
      return false;
    }

    const unusedSubkey = currentState.find((subkey) => !subkey.used);

    if (!unusedSubkey) {
      console.log("findFree: All subkeys are in use");
      return false;
    }

    const newSubkey = {
      api_key: unusedSubkey.api_key,
      used: true,
    };

    const finalState = currentState.map((subkey) => {
      return subkey.api_key === unusedSubkey.api_key ? newSubkey : subkey;
    });

    await state.set(primary_account_api_key, finalState);

    const recordKey = `${primary_account_api_key}:${unusedSubkey.api_key}`;
    const unusedSubkeyInfo = await state.get(recordKey);

    return unusedSubkeyInfo;
  } catch (error) {
    console.error(`findFree ERROR: ${error.message}`);
    return false;
  }
}

export async function deleteRecord(record, used) {
  try {
    let getMainState = await state.get(record.primary_account_api_key);

    if (!getMainState) {
      console.log("deleteRecord: Primary account not found");
      return;
    }

    const newSubkey = {
      api_key: record.api_key,
      used: used,
    };

    let tempState = getMainState.filter(
      (subkey) => subkey.api_key !== record.api_key
    );

    tempState.push(newSubkey);

    await state.set(record.primary_account_api_key, tempState);

    getMainState = await state.get(record.primary_account_api_key);
    console.log("deleteRecord > final:", getMainState);
  } catch (error) {
    console.error(`deleteRecord ERROR: ${error.message}`);
  }
}

export async function deleteTable(record) {
  try {
    const recordKey = `${record.primary_account_api_key}:${record.api_key}`;

    let deleteRecordState = await state.delete(recordKey);
    console.log(
      `deleteTable > recordKey ${recordKey} deleteRecordState: ${deleteRecordState}`
    );

    let getRecordState = await state.get(recordKey);
    console.log("deleteTable > getRecordState", getRecordState);
  } catch (error) {
    console.error(`deleteTable ERROR: ${error.message}`);
  }
}

export async function createRecord(record, used) {
  try {
    let table = await setTable(record);

    let index = await setIndex(record, used);
    let response = `createRecord NEW SUBACOUNT: ${table} and ${index}`;
    return response;
  } catch (error) {
    console.error(`createRecord ERROR: ${error.message}`);
  }
}

export async function getRecord(recordKey) {
  try {
    let getRecordState = await state.get(recordKey); // null if not exist
    console.log(
      `getRecord recordKey ${recordKey}, ${getRecordState} - recordKey does not exist`
    ); // recordKey (apikey:subkey)
    return getRecordState;
  } catch (error) {
    console.error(`getRecord ERROR: ${error.message}`);
    return null;
  }
}

export async function getTable(record) {
  try {
    const recordKey = `${record.primary_account_api_key}:${record.api_key}`;
    let getRecordState = await state.get(recordKey); // null if not exist
    console.log(`getTable > recordKey ${recordKey}`); // recordKey (apikey:subkey)

    if (getRecordState === null) {
      console.log(
        "getTable > getRecordState: ",
        getRecordState,
        "so it does not exist"
      );
    } else {
      console.log("getTable > getRecordState: ", getRecordState);
    }
  } catch (error) {
    console.error(`getTable ERROR: ${error.message}`);
  }
}

// IF record (apikey:subkey) exists return nothing, ELSE save the record.
export async function setTable(record) {
  try {
    const recordKey = `${record.primary_account_api_key}:${record.api_key}`;
    let getRecordState = await state.get(recordKey);

    if (getRecordState) {
      console.log("setTable > recordKey already exists");
      return;
    } else {
      let setRecordState = await state.set(recordKey, record);
      console.log("SAVED RECORD:", record);
      // SAVED RECORD: {
      //   api_key: '332ccb38',
      //   secret: 'example-4PI-secret',
      //   primary_account_api_key: '89b7a9b7',
      //   use_primary_account_balance: true,
      //   name: 'Vonage - Mark',
      //   balance: null,
      //   credit_limit: null,
      //   suspended: false,
      //   created_at: '2024-05-24T01:43:08.419Z',
      //   signature_secret: 'LdDVG5jn4FGmtia8UwZm6J6Oi6cI1B1lXNEsEdlXS24MgMZXxq'
      // }
      return setRecordState;
    }
  } catch (error) {
    console.error(`setTable ERROR: ${error.message}`);
  }
}

export async function setIndex(record, used) {
  try {
    let getMainState = await state.get(record.primary_account_api_key);

    // Flip Boolean
    // IF suspended: true SET used: false
    // IF suspended: false SET used: true

    let newSubkey = {
      api_key: record.api_key,
      used: !used,
    };
    let tempState = [];

    if (getMainState === null) {
      tempState.push(newSubkey);
    } else {
      if (getMainState.some((subkey) => subkey.api_key === record.api_key)) {
        console.log("setIndex api_key already in Index");
        return;
      } else {
        tempState = getMainState.slice(); // Make a copy to avoid modifying the original array
        tempState.push(newSubkey);
      }
    }

    let setMainState = await state.set(
      record.primary_account_api_key,
      tempState
    );
    console.log(
      `setIndex > sub_key: ${record.api_key} added to index: ${record.primary_account_api_key}, setMainState: ${setMainState}`
    );

    getMainState = await state.get(record.primary_account_api_key);
    console.log("setIndex > getIndex:", getMainState);
    return setMainState;
  } catch (error) {
    console.error(`setIndex ERROR: ${error.message}`);
  }
}

export async function setIndexFreeUpdate(record, used) {
  try {
    let getMainState = await state.get(record.primary_account_api_key);

    let newSubkey = {
      api_key: record.api_key,
      used: used,
    };
    let tempState = [];

    if (getMainState === null) {
      tempState.push(newSubkey);
    } else {
      if (getMainState.some((subkey) => subkey.api_key === record.api_key)) {
        console.log("setIndexFreeUpdate api_key EXISTS IN Index");
        return;
      } else {
        console.log("setIndexFreeUpdate api_key NOT IN Index");
        tempState = getMainState.slice(); // Make a copy to avoid modifying the original array
        tempState.push(newSubkey);
      }
    }

    let setMainState = await state.set(
      record.primary_account_api_key,
      tempState
    );
    console.log(
      `setIndex > sub_key: ${record.api_key} added to index: ${record.primary_account_api_key}, setMainState: ${setMainState}`
    );

    getMainState = await state.get(record.primary_account_api_key);
    console.log("setIndex > getIndex:", getMainState);
    return setMainState;
  } catch (error) {
    console.error(`setIndex ERROR: ${error.message}`);
  }
}

export async function getIndex(record) {
  try {
    let getMainState = await state.get(record.primary_account_api_key);
    console.log(`getIndex > ${record.primary_account_api_key}:`, getMainState);
  } catch (error) {
    console.error(`getIndex ERROR: ${error.message}`);
  }
}

export async function deleteIndex(record) {
  try {
    let delMainState = await state.delete(record.primary_account_api_key);
    console.log(
      `deleteIndex > ${record.primary_account_api_key}:`,
      delMainState
    );
  } catch (error) {
    console.error(`deleteIndex ERROR: ${error.message}`);
  }
}

export async function modifyTable(record, used) {
  const recordKey = `${record.primary_account_api_key}:${record.api_key}`;
  try {
    let getRecordState = await state.get(recordKey);

    if (getRecordState) {
      console.log("modifyTable > recordKey exists");
      let setRecordState = await state.set(recordKey, record);
      console.log(
        `modifyTable > recordKey ${recordKey} setRecordState: ${setRecordState}`
      );

      let getRecordState = await state.get(recordKey);
      console.log("modifyTable:", getRecordState);

      if (used === false) {
        let getMainState = await state.get(record.primary_account_api_key);
        console.log("modifyTable > current:", getMainState);
        let tempState = getMainState;
        let newSubkey = {
          api_key: record.api_key,
          used: used,
        };

        tempState = tempState.filter(
          (subkey) => subkey.api_key !== record.api_key
        );
        console.log("modifyTable > whats left:", tempState);

        tempState.push(newSubkey);
        console.log("modifyTable > inserted:", tempState);

        let setMainState = await state.set(
          record.primary_account_api_key,
          tempState
        );
        console.log("modifyTable > setMainState:", setMainState);

        getMainState = await state.get(record.primary_account_api_key);
        console.log("modifyTable > final:", getMainState);
      }
    }
  } catch (error) {
    console.error(`modifyTable ERROR: ${error.message}`);
  }
}
