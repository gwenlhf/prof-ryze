const functions = require('firebase-functions');
const firebase = require('firebase');
const fbConfig = require('../nocommit/prof-ryze-firebase-usercfg.json');

let db = firebase.database();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((req, res) => {

})

function abilityDescHandler ( req ) {
	
}

function fetchChampAbility( key, idx=0 ) {
	return db.ref('/champs/data/' + key)
		.once('spells/' + idx);
}

function fetchChampPassive( key ) {
	return db.ref('/champs/data/' + key)
		.once('passive');
}

function fetchChampTip( key, ally=true ) {
	return db.ref('/champs/data/' + key)
		.once(`${ (ally) ? 'ally' : 'enemy' }tips`)
		.then(tips => {
			return tips[ Math.floor( Math.random() * tips.length ) ]
		});
}

function fetch