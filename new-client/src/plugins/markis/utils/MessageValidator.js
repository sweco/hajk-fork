export function validateMessageParameters(markisParameters, message) {
  function validateShowMessage(markisParameters, message) {
    if (markisParameters.type === "Contract") {
      if (message.objectId.length < 3) {
        return [false, "Avtalsnumret måste bestå av minst 3 tecken."];
      } else {
        return [true, "OK"];
      }
    } else if (markisParameters.type === "LongLease") {
      if (message.objectId.length < 4) {
        return [
          false,
          "Du måste ange fler tecken för att kunna visa en tomträtt."
        ];
      } else {
        return [true, "OK"];
      }
    } else if (markisParameters.type === "Estate") {
      if (message.objectId.length < 4) {
        return [
          false,
          "Du måste ange fler tecken för att kunna visa en fastighet."
        ];
      } else {
        return [true, "OK"];
      }
    }
  }

  function validateCreateTradeMessage(message) {
    if (!message.userName) {
      return [false, "Markis skickade inte ett giltligt användarnamn"];
    } else {
      return [true, "OK"];
    }
  }

  function validateCreateContractMessage(message) {
    if (message.objectId.length !== 10) {
      return [false, "Avtalsnumret måste bestå av 10 tecken."];
    } else if (message.objectStatus.toUpperCase() === "G") {
      return [false, "Du kan inte skapa en avtalsyta med gällande status."];
    } else if (
      isNaN(message.objectSerial) ||
      message.objectSerial === "0" ||
      message.objectSerial === ""
    ) {
      return [false, "Markis skickade inte ett giltligt händelselöpnummer."];
    } else if (!message.userName) {
      return [false, "Markis skickade inte ett giltligt användarnamn"];
    } else {
      return [true, "OK"];
    }
  }

  if (markisParameters.userMode === "Show") {
    return validateShowMessage(markisParameters, message);
  } else if (markisParameters.userMode === "Create") {
    if (markisParameters.type === "Contract") {
      return validateCreateContractMessage(message);
    } else if (
      markisParameters.type === "Purchase" ||
      markisParameters.type === "Sale"
    ) {
      return validateCreateTradeMessage(message);
    }
  }
}
