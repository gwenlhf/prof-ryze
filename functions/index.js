const functions = require('firebase-functions');
const firebase = require('firebase');
const fbConfig = require('./nocommit/prof-ryze-firebase-usercfg.json');

const version = '8.9.1';
const ddragon = `http://ddragon.leagueoflegends.com/cdn/${ version }`;

firebase.initializeApp(fbConfig);

let db = firebase.database();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(( req, res ) => webHookDriver( req, res ));

function webHookDriver( req, res ) {
	let hook = req.body;
	let intent = hook.queryResult.intent;
	let params = hook.queryResult.parameters;
	let result;
	if ( intent.displayName === 'Ability-Desc' ) {
		result = abilityDescHandler(params)
			.then(data => abilityDescMsg(data));
	}
	result.then(body => res.send(body))
		.catch(err => res.send(err));
}

function abilityDescHandler ( params ) {
	let key = params.Champion;

	let result;
	switch ( params.Ability ) {
	case 'Q':
		result = fetchChampAbility( key, 0 );
		break;
	case 'W':
		result = fetchChampAbility( key, 1 );
		break;
	case 'E':
		result = fetchChampAbility( key, 2 );
		break;
	case 'R':
		result = fetchChampAbility( key, 3 );
		break;
	case 'Passive':
		return fetchChampPassive( key )
			.then(passive => passiveDescMsg(passive));
	default:
		return Promise.reject(new Error("No ability specified"));
	}
	return result.then(ability => abilityDescMsg(ability));
}

function retrieveDb( ref ) {
	return db.ref(ref)
		.once('value')
		.then(snapshot => snapshot.val());
}

function passiveDescMsg( passive ) {
	return {
		fulfillmentText : passive.sanitizedDescription,
		fulfillmentMessages : [
			{
				card : {
					title : passive.name,
					subtitle : passive.sanitizedDescription,
					imageUri : ddragon + '/img/passive/' + passive.image.full
				}
			}
		]
	};
}

function abilityDescMsg( ability ) {
	return {
		fulfillmentText: ability.sanitizedDescription,
		fulfillmentMessages: [
			{
				card : {
					title : ability.name,
					subtitle : ability.sanitizedDescription,
					imageUri : ddragon + '/img/spell/' + ability.image.full
				}
			}
		]
	};
}



function fetchAbilityDesc( key, idx=0 ) {
	return retrieveDb(`/champs/data/${ key }/spells/${ idx }/sanitizedDescription`);
}

function fetchChampAbility( key, idx=0 ) {
	return retrieveDb(`/champs/data/${ key }/spells/${ idx }`);
}

function fetchChampPassive( key ) {
	return retrieveDb(`/champs/data/${ key }/passive`);
}

function fetchChampTip( key, ally=true ) {
	return retrieveDb(`/champs/data/${ key }/${ (ally) ? 'ally' : 'enemy' }tips`)
		.then(tips => tips[ Math.floor( Math.random() * tips.length ) ]);
}