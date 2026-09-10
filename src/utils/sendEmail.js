const { SendEmailCommand } = require("@aws-sdk/client-ses");
const { sesClient } = require("./sesClient");

const createSendEmailCommand = (toAddress, fromAddress, subject, htmlBody, textBody) => {
  return new SendEmailCommand({
    Destination: {
      CcAddresses: [],
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Html: { Charset: "UTF-8", Data: htmlBody },
        Text: { Charset: "UTF-8", Data: textBody },
      },
      Subject: { Charset: "UTF-8", Data: subject },
    },
    Source: fromAddress,
    ReplyToAddresses: [],
  });
};

const run = async (toAddress, subject, htmlBody, textBody) => {
  const fromAddress = process.env.SES_FROM_EMAIL;
  const sendEmailCommand = createSendEmailCommand(toAddress, fromAddress, subject, htmlBody, textBody);

  try {
    return await sesClient.send(sendEmailCommand);
  } catch (caught) {
    console.error("SES send error:", caught);
    if (caught instanceof Error && caught.name === "MessageRejected") {
      return caught;
    }
    throw caught;
  }
};

module.exports = { run };