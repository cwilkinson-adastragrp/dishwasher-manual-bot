// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { TimexProperty } = require('@microsoft/recognizers-text-data-types-timex-expression');
const { ActivityTypes, AttachmentLayoutTypes, CardFactory, MessageFactory, InputHints } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');
const { ComponentDialog, DialogSet, DialogTurnStatus, TextPrompt, WaterfallDialog } = require('botbuilder-dialogs');

var axios = require('axios')

const MAIN_WATERFALL_DIALOG = 'mainWaterfallDialog';
const INITIAL_WATERFALL_DIALOG = 'INITIAL_WATERFALL_DIALOG';

const USER_PROFILE = 'USER_PROFILE';
const TEXT_PROMPT = 'TEXT_PROMPT';

// Gather Resources
const AdaptiveCard = require('../resources/welcomeCard.json');
const { UserProfile } = require('../resources/userProfile');

class MainDialog extends ComponentDialog {
    constructor(userState) {
        super('MainDialog');

        this.userProfile = userState.createProperty(USER_PROFILE);

        // Define the main dialog and its related components.
        // This is a sample "book a flight" dialog.
        this.addDialog(new TextPrompt(TEXT_PROMPT))

        this.addDialog(new WaterfallDialog(INITIAL_WATERFALL_DIALOG, [
            this.questionPrompt.bind(this),
            this.handleQuestionPrompt.bind(this)
        ]));

        this.initialDialogId = INITIAL_WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    /**
     * Prompts the User to ask a Question to the AdastraOpenAI Service.
     * 
     * Part of the INITIAL_WATERFALL_DIALOG.
     *
     * @param {WaterfallStepContext} stepContext
     */
    async questionPrompt(stepContext) {
        console.log('MainDialog.questionPrompt');
        var userProfile = await this.userProfile.get(stepContext.context, new UserProfile());

        // Prompt the user with the configured PromptOptions.
        return await stepContext.prompt(TEXT_PROMPT);
    }

    /**
     * Prompts the User to ask a Question to the STAN Service.
     * 
     * Part of the INITIAL_WATERFALL_DIALOG.
     *
     * @param {WaterfallStepContext} stepContext
     */
    async handleQuestionPrompt(stepContext) {

        // Get the current profile object from user state.
        const userProfile = await this.userProfile.get(stepContext.context, new UserProfile());

        // Initialize Chat History (if empty)
        if (userProfile.chat_hist === undefined) {
            userProfile.chat_hist = [];
        }

        // Text Response
        await stepContext.context.sendActivities([
                { type: ActivityTypes.Typing },
                // { type: 'delay', value: 5000 },
                // { type: ActivityTypes.Message, text: String() }
                ]);

        // Hit Adastra OpenAI API
        let data = {
                        "query":  stepContext.result,
                        "inputs": userProfile.chat_hist
                    };

        const echo_url = "https://adastraopenaiecho.azurewebsites.net/api/response"
        const openai_url = "https://saitsearchservice.azurewebsites.net/api/response"

        console.log(await userProfile.chat_hist);

        // Hit Adastra OpenAI API
        var response = axios
                .post(
                    openai_url,
                    data,
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                .then((res) => {
                    // Convert response to JSON format
                    return res.data;
                });

        // console.log(await response);

        var dataResponse = JSON.stringify(await response);
        dataResponse = JSON.parse(await JSON.stringify(dataResponse));
        var parsedResponse = JSON.parse(await dataResponse);
        // var parsedResponse = JSON.parse('{"response": "HEY!"}')

        // console.log(await parsedResponse.response);

        // Update Input List
        if (userProfile.chat_hist.length < 7) {
            userProfile.chat_hist.push(await parsedResponse.response);
            userProfile.chat_hist.push(stepContext.result);
        } else {
            userProfile.chat_hist.push(await parsedResponse.response);
            userProfile.chat_hist.push(stepContext.result);
            let popped1 = userProfile.chat_hist.shift();
            let popped2 = userProfile.chat_hist.shift();
        }

        // Adaptive Card Response
        // let responseCard = this.createRatingCard(await parsedResponse.response);

        // await stepContext.context.sendActivity({
        //                     attachments: [await responseCard],
        //                     attachmentLayout: AttachmentLayoutTypes.Carousel
        //                 });
        
        await stepContext.context.sendActivity(await parsedResponse.response);
        return await stepContext.beginDialog(INITIAL_WATERFALL_DIALOG);
    }

    /**
     * Function used to create Rating Adaptive Cards with Responses
     *
     * 
     * var userResponse = await cardResponse.response;
            let chosenData = JSON.parse(cardResponse.data);
            let selectStandardNumber = await chosenData.standard_number;
            let selectClauseNumber = await chosenData.data_number;
     * 
     * 
     * @param {list} cardChoices
     */
    async createRatingCard(openai_response) {
        return CardFactory.adaptiveCard({
              "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
              "type": "AdaptiveCard",
              "version": "1.0",
              "body": [
                    // {
                    //   "type": "TextBlock",
                    //   "spacing": "medium",
                    //   "size": "default",
                    //   "weight": "bolder",
                    //   "text": "Here is what I found:",
                    //   "horizontalAlignment": "left",
                    //   "wrap": true,
                    //   "maxLines": 0
                    // },
                    {
                      "type": "TextBlock",
                      "size": "default",
                      "isSubtle": false,
                      "text": openai_response + "\n",
                      "horizontalAlignment": "left",
                      "wrap": true,
                      "maxLines": 0
                    }
                    // {
                    //     "type": "ColumnSet",
                    //     "spacing": "medium",
                    //     "seperator": true,
                    //     "columns": [
                    //         {
                    //             "type": "Column",
                    //             "width": "stretch",
                    //             "items": [
                    //                 {
                    //                   "type": "Image",
                    //                   "url": "https://media.glassdoor.com/sql/673145/adastra-group-squarelogo-1577467674740.png",
                    //                   "width": "50px",
                    //                   "horizontalAlignment": "left",
                    //                   "verticalAlignment": "center"
                    //                 }
                    //             ]
                    //         },
                    //         {
                    //             "type": "Column",
                    //             "width": "auto",
                    //             "items": [
                    //                 {
                    //                   "type": "Image",
                    //                   "url": "https://seeklogo.com/images/O/open-ai-logo-8B9BFEDC26-seeklogo.com.png",
                    //                   "width": "50px",
                    //                   "horizontalAlignment": "right",
                    //                   "verticalAlignment": "center"
                    //                 }
                    //             ]
                    //         }
                            
                    //     ]
                    // }
              ]
            });
    }

}

module.exports.MainDialog = MainDialog;
