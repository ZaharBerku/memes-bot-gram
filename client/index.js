const { TelegramClient, Api } = require("telegram");
const { NewMessage } = require("telegram/events");
const { StringSession } = require("telegram/sessions");
const input = require("input");
require("dotenv").config();

const {
  API_HASH: apiHash,
  CHANNEL_ID,
  LISTEN_CHANNEL_ID,
  API_ID: apiId,
  SESSION_TOKEN,
} = process.env;

let idTimeout = null;
let medias = [];
let messagePost = null;
let base64 = null;

const stringSession = new StringSession(SESSION_TOKEN);

const client = new TelegramClient(stringSession, +apiId, apiHash, {
  connectionRetries: 5,
});

async function authorize() {
  await client.connect();
  const isAuth = await client.checkAuthorization();

  if (isAuth) {
    console.log("I am logged in!");
  } else {
    await client.start({
      phoneNumber: async () => await input.text("Please enter your number: "),
      phoneCode: async () =>
        await input.text("Please enter the code you received: "),
      onError: (err) => console.log(err),
    });
    const seesion = client.session.save();
    console.log(seesion, "seesion");
    console.log(
      "I am connected to telegram servers but not logged in with any account. Let's autorize"
    );
  }
  return client;
}

const resetValues = () => {
  messagePost = null;
  base64 = null;
  medias = [];
  clearTimeout(idTimeout);
  idTimeout = null;
};

const sendPost = async (message, medias, parseMode) => {
  const cleanDialogIdString = CHANNEL_ID.replace("n", "");
  const dialogIdBigInt = BigInt(cleanDialogIdString);
  if (medias.length) {
    await client.sendFile(dialogIdBigInt, {
      file: medias,
      caption: message,
      parseMode,
    });
  }
};

async function eventHandler(event) {
  const message = event.message;
  if (message) {
    if (!messagePost) {
      messagePost = message.message;
    }
    if (message.media) {
      medias.push(message.media);
    }
    if (!idTimeout && !messagePost) {
      idTimeout = setTimeout(async () => {
        try {
          await sendPost("", medias, "md");
          resetValues();
        } catch (error) {
          console.log(error);
          await sendPost("", medias, "md");
          resetValues();
        }
      }, 5000);
    }
  } else {
    resetValues();
  }
}

async function run() {
  const client = await authorize();
  const dialogs = await client.getDialogs();
  console.log(
    dialogs.find((item) => item.title === "Бро скинув мем"),
    "dialogs"
  );
  client.addEventHandler(
    (event) => eventHandler(event),
    new NewMessage({ chats: LISTEN_CHANNEL_ID.split(",") })
  );
}

module.exports = run;
