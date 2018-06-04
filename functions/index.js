'use strict';

const { ryze } = require('./prof-ryze.js');
const functions = require('firebase-functions');

const app = dialogflow();

// initialization and driver function
function hookupApp( handlers ) {
	for (let intent in handlers) {
		app.intent(intent, handlers[intent]);
	}
}

hookupApp(ryze);

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);