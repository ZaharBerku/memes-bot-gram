const { TelegramClient } = require("telegram");
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
let queue = {};

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
  clearTimeout(idTimeout);
  queue = {};
  idTimeout = null;
};

const sendPost = async (message, medias, parseMode) => {
  const cleanDialogIdString = CHANNEL_ID.replace("n", "");
  const dialogIdBigInt = BigInt(cleanDialogIdString);
  if (medias.length) {
    const linkInEndMessage =
      "\n\n" + "[Павуко меми😂](https://t.me/pavuko_mem)";

    await client.sendFile(dialogIdBigInt, {
      file: medias,
      caption: linkInEndMessage,
      parseMode,
    });
  }
};

const fetchSendPost = async (medias = [], name) => {
  try {
    await sendPost("", medias, "md2");
  } catch (error) {
    console.log(error, "error");

    await sendPost("", medias, "md2");
  } finally {
    const { [name]: alreadySend, ...lastQueue } = queue;
    queue = lastQueue || {};
  }
};

async function eventHandler(event) {
  const message = event.message;
  if (
    message &&
    (message.message.includes("Підписатись на QTV") || !message.message)
  ) {
    const groupId = message.groupedId?.value || message.id;
    queue = { ...queue, [groupId]: queue[groupId] || {} };
    if (message.media) {
      queue[groupId].medias = [...(queue[groupId].medias || []), message.media];
    }
    if (idTimeout) {
      clearTimeout(idTimeout);
      idTimeout = null;
    }
    idTimeout = setTimeout(async () => {
      await Promise.allSettled(
        Object.entries(queue).map(([name, post]) =>
          fetchSendPost(post.medias, name)
        )
      );
      resetValues();
    }, 5000);
  }
}

async function run() {
  console.log(client.connected, "client.connected");
  if (!client.connected) {
    const authClient = await authorize();
    authClient.addEventHandler(
      (event) => eventHandler(event),
      new NewMessage({ chats: LISTEN_CHANNEL_ID.split(",") })
    );
  }
}

module.exports = run;
