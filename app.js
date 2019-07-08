// This loads the environment variables from the .env file
require("dotenv-extended").load();

const builder = require("botbuilder");
const restify = require("restify");
const Store = require("./store");
const spellService = require("./spell-service");

// Setup Restify Server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`${server.name} listening to ${server.url}`);
});

// Create connector and listen for messages
const connector = new builder.ChatConnector({
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post("/api/messages", connector.listen());

// Default store: volatile in-memory store - Only for prototyping!
var inMemoryStorage = new builder.MemoryBotStorage();
var bot = new builder.UniversalBot(connector, function(session) {
  session.send(
    "Sorry, I did not understand '%s'. Type 'help' if you need assistance.",
    session.message.text
  );
}).set("storage", inMemoryStorage); // Register in memory storage

// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/
const recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

const roomsList = [
  "sea-view",
  "double",
  "city-view",
  "single",
  "luxury",
  "deluxe",
  "smoking",
  "non-smoking"
];

bot.on("conversationUpdate", message => {
  if (message.membersAdded) {
    message.membersAdded.forEach(function(identity) {
      if (identity.id === message.address.bot.id) {
        const welcomeCard = new builder.Message()
          .address(message.address)
          .addAttachment({
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              speak:
                "<s>Your  meeting about \"Adaptive Card design session\"<break strength='weak'/> is starting at 12:30pm</s><s>Do you want to snooze <break strength='weak'/> or do you want to send a late notification to the attendees?</s>",
              body: [
                {
                  type: "Image",
                  size: "large",
                  url:
                    "https://www.constancehospitality.com/images/logo_254.png"
                },
                {
                  type: "TextBlock",
                  text: "Welcome to Constance Bot! Your friendly Bot!"
                }
              ]
            }
          });

        bot.send(welcomeCard);
      }
    });
  }
});

bot
  .dialog("Greetings", [
    (session, args, next) => {
      session.send("Hello there!!\n\n Please enter your destination ");
    }
  ])
  .triggerAction({
    matches: "Greetings"
  });

bot
  .dialog("SearchHotels", [
    (session, args, next) => {
      session.send(
        `We are analyzing your request: ${
          session.message.text
        }. Please give us a minute!`
      );
      next({ response: session.message.text });
    },
    (session, results) => {
      const destination = results.response;
      let message = "Looking for hotels";
      if (session.dialogData.searchType === "airport") {
        message += " near %s airport...";
      } else {
        message += " in %s...";
      }
      session.send(message, destination);
      Store.searchHotels(destination).then(hotels => {
        session.send(`I found ${hotels.length} hotels:`);
        let message = new builder.Message()
          .attachmentLayout(builder.AttachmentLayout.carousel)
          .attachments(hotels.map(hotelAsAttachment));
        session.send(message);
        session.endDialog();
      });
    }
  ])
  .triggerAction({
    matches: "SearchHotels",
    onInterrupted: session => {
      session.send("Please provide a destination");
    }
  });

bot
  .dialog("Rooms", [
    (session, results, next) => {
      const typeOfRoom = results.response;
      let message = "Looking for available rooms";
      session.send(message, typeOfRoom);
      Store.searchRooms(typeOfRoom).then(rooms => {
        session.send(`I found ${rooms.length} available rooms:`);
        let roomChoice = builder.Prompts.choice(
          session,
          "What kind of room do you want?",
          roomsList
        );
        session.send(roomChoice);
        next({ response: args });
      });
    },
    (session, args, next) => {
      var numberOfRooms = builder.Prompts.number(
        session,
        "Amazing! How many rooms do you want to book?"
      );
      session.send(numberOfRooms);
      next();
    },
    (session, args, next) => {
      builder.Prompts.confirm(
        session,
        "Do you want to confirm your reservation?"
      );
    },
    (session, args) => {
      if (args.response) {
        session.send(
          "`Thanks for the reaching out to us!! Your booking is confirmed! A confirmation email has been sent to your email. We hope you have a pleasant stay!!`"
        );
      } else {
        session.send("Hope you have a nice day!");
      }
    }
  ])
  .triggerAction({
    matches: "Rooms",
    onInterrupted: session => {
      session.send("Please provide a valid choice");
    }
  });

bot
  .dialog("ShowHotelsReviews", (session, args) => {
    const hotelEntity = builder.EntityRecognizer.findEntity(
      args.intent.entities,
      "Hotel"
    );
    if (hotelEntity) {
      session.send(`Looking for reviews of '${hotelEntity.entity}'...`);
      Store.searchHotelReviews(hotelEntity.entity).then(reviews => {
        let message = new builder.Message()
          .attachmentLayout(builder.AttachmentLayout.carousel)
          .attachments(reviews.map(reviewAsAttachment));
        session.endDialog(message);
      });
    }
  })
  .triggerAction({
    matches: "ShowHotelsReviews"
  });

bot
  .dialog("Help", session => {
    session.endDialog(
      `Try asking me things like 'search hotels in Mauritius' or 'show me the reviews of Constance Prince Maurice'`
    );
  })
  .triggerAction({
    matches: "Help"
  });

if (process.env.IS_SPELL_CORRECTION_ENABLED === "true") {
  bot.use({
    botbuilder: (session, next) => {
      spellService
        .getCorrectedText(session.message.text)
        .then(text => {
          session.message.text = text;
          next();
        })
        .catch(error => {
          console.error(error);
          next();
        });
    }
  });
}

const hotelAsAttachment = hotel => {
  return new builder.HeroCard()
    .title(hotel.name)
    .subtitle(
      "%d stars. %d reviews. From $%d per night.",
      hotel.rating,
      hotel.numberOfReviews,
      hotel.priceStarting
    )
    .images([new builder.CardImage().url(hotel.image)])
    .buttons([
      new builder.CardAction()
        .title("More details")
        .type("openUrl")
        .value("https://www.constancehotels.com/en/")
    ]);
};

const roomAsAttachment = room => {
  return (
    new builder.HeroCard()
      .title(room.name)
      .subtitle("%d stars. %d reviews. From $%d per night.", room.name)
      // .images([new builder.CardImage().url(hotel.image)])
      .buttons([
        new builder.CardAction()
          .title("More details")
          .type("openUrl")
          .value("https://www.constancehotels.com/en/")
      ])
  );
};

const reviewAsAttachment = review => {
  return new builder.ThumbnailCard()
    .title(review.title)
    .text(review.text)
    .images([new builder.CardImage().url(review.image)]);
};
