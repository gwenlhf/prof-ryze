'use strict';

const functions = require('firebase-functions');
const { dialogflow } = require('actions-on-google');
const firebase = require('firebase');
const fbConfig = require('./nocommit/prof-ryze-firebase-usercfg.json');
const ryze = require('./prof-ryze.js');
const database = require('./database.js');

firebase.initializeApp(fbConfig);
let db = firebase.database();

const app = dialogflow();

// initialization and driver function
function hookupApp( handlers ) {
	for (let intent in handlers) {
		app.intent(intent, handlers[intent]);
	}
}

hookupApp(
	ryze({ 
		db: database(db)
	})
);

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
