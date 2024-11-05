import { vcr } from "@vonage/vcr-sdk";
const state = vcr.getInstanceState();

export async function findFree(primary_account_api_key) {
  try {
    const currentState = await state.get(primary_account_api_key);

    if (!currentState) {
      // console.log("findFree: Primary account not found");
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

// returns null if the recordKey does not exists in VCR.
export async function getRecord(recordKey) {
  try {
    let getRecordState = await state.get(recordKey); // null if not exist
    console.log(`\ngetRecord recordKey: ${recordKey}`); // recordKey (apikey:subkey)
    console.log("getRecord getRecordState:", getRecordState);
    return getRecordState;
  } catch (error) {
    console.error(`getRecord ERROR: ${error.message}`);
    return null;
  }
}

export async function setTable(record, isNew) {
  try {
    const recordKey = `${record.primary_account_api_key}:${record.api_key}`;
    let getRecordState = await state.get(recordKey);
    console.log("setTable > getRecordState:", getRecordState);
    console.log("setTable > isNew:", isNew);

    // if false and false: should never happen
    // if true and true: should never happen
    // if true and false: Modify when DELETE called or MODIFY. WE WANT suspended: true and used: false
    // if false and true: apiSignatureSecret called
    if (!getRecordState && !isNew) {
      console.error("\n\nsetTable > FALSE & FALSE");
      return;
    } else if (getRecordState && isNew) {
      console.error("\n\nsetTable > TRUE & TRUE");
      return;
    } else if (getRecordState && !isNew) {
      getRecordState.suspended = false;
      let setRecordState = await state.set(recordKey, getRecordState);
      console.log("\n\nsetTable > EXISTS");
      return;
    } else if (!getRecordState && isNew) {
      let setRecordState = await state.set(recordKey, record);
      console.log(
        "\n\nsetTable > SAVING RECORD:",
        setRecordState,
        "record:",
        record
      );
      return;
    } else {
      console.error("\n\nsetTable > OTHER CONDITION");
      return;
    }
  } catch (error) {
    console.error(`setTable ERROR: ${error.message}`);
  }
}

// /set-subkey uses this.
// modifyRecord() uses this.
// Flip Boolean
// IF suspended: true SET used: false;
// IF suspended: false SET used: true;
export async function setIndex(record, used) {
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

    return setMainState;
  } catch (error) {
    console.error(`setIndex ERROR: ${error.message}`);
  }
}

export async function resetIndex(record) {
  try {
    let currentState = await state.get(record.primary_account_api_key);

    if (!currentState) {
      // console.log("findFree: Primary account not found");
      return false;
    }
    
    await setIndex(record, !record.suspended);

    return record;
  } catch (error) {
    console.error(`resetIndex ERROR: ${error.message}`);
    return false;
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

export async function modifyRecord(
  record,
  new_secret,
  new_name,
  isSuspended,
  isNew,
  isUsed
) {
  record.secret = new_secret;
  record.name = new_name;
  record.suspended = isSuspended;
  // updates record for subaccount /get-subaccount
  await setTable(record, isNew);
  // updates /get-index
  await setIndex(record, isUsed); // set record.used = true
  console.log("createPool return record: ", record);
  return record;
}

// DELETE calls this with (record, false) to set used: false for subaccount in mainState (/get-index)
export async function modifyTable(record, used) {
  const recordKey = `${record.primary_account_api_key}:${record.api_key}`;
  try {
    let getRecordState = await state.get(recordKey);

    // Check if the recordKey exists in VCR, IF true and you pass false from DELETE
    // then set used:false to make available in mainState (contains subaccounts list for /get-index)
    if (getRecordState) {
      console.log("modifyTable > recordKey exists");
      let setRecordState = await state.set(recordKey, record);
      console.log(
        `modifyTable > recordKey ${recordKey} setRecordState: ${setRecordState}`
      );

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
      }
    }
  } catch (error) {
    console.error(`modifyTable ERROR: ${error.message}`);
  }
}
