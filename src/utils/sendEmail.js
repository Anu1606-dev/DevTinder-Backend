const { SendEmailCommand } = require ("@aws-sdk/client-ses");
const { sesClient } = require ("./sesClient");

const createSendEmailCommand = (toAddress, fromAddress) => {
  return new SendEmailCommand({
    Destination: {
      CcAddresses: [],
      ToAddresses: [
        toAddress,
      ],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: "<h1>HTML_FORMAT_BODY</h1>",
        },
        Text: {
          Charset: "UTF-8",
          Data: "this is the text format body",
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Test email from AWS SES",
      },
    },
    Source: fromAddress,
    ReplyToAddresses: [],
  });
};

const run = async () => {
  const sendEmailCommand = createSendEmailCommand(
    "sarkaranushka614@gmail.com",
    "sarkaranushka614@gmail.com",
  );

  try {
    return await sesClient.send(sendEmailCommand);
  } catch (caught) {
    if (caught instanceof Error && caught.name === "MessageRejected") {
      const messageRejectedError = caught;
      return messageRejectedError;
    }
    throw caught;
  }
};

module.exports = { run };
