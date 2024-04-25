// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { CardFactory } = require('botbuilder-core');
const { DialogBot } = require('./dialogBot');

class AdastraOpenAIBot extends DialogBot {
    constructor(conversationState, userState, dialog) {
        super(conversationState, userState, dialog);

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;

            await context.sendActivity('Hi there! I am the Adastra Search Bot that specializes on information about **Adastra Abbreviations and Definitions**. Please ask me a question pertaining to a standard, and I will try to help you out!');
            
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await dialog.run(context, conversationState.createProperty('DialogState'));
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.AdastraOpenAIBot = AdastraOpenAIBot;
