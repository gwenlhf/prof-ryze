'use strict';

const functions = require('firebase-functions');
const { WebhookClient, Card, Suggestion } = require('dialogflow-fulfillment');
const firebase = require('firebase');
const fbConfig = require('./nocommit/prof-ryze-firebase-usercfg.json');

const version = '8.9.1';
const ddragon = `http://ddragon.leagueoflegends.com/cdn/${ version }`;

firebase.initializeApp(fbConfig);

let db = firebase.database();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(( req, res ) => webHookDriver( req, res ));

function webHookDriver( req, res ) {
	let agent = new WebhookClient({request: req, response: res});
	let intentMap = new Map();
	intentMap.set('Ability-Desc', abilityDescHandler);
	intentMap.set('Champ-Tip-Ally', a => champTipHandler( a, true));
	intentMap.set('Champ-Tip-Enemy', a => champTipHandler( a, false));
	agent.handleRequest(intentMap);
}

function champTipHandler( agent, isAlly=true ) {
	let key = agent.parameters.Champion;
	return fetchChampTip( key, isAlly )
		.then( tip => champTipResponses( agent, tip, isAlly ));
}

function champTipResponses ( agent, tip, isAlly ) {
	agent.add( tip );
	let card = (isAlly) ? new Card(`Playing against `)
	if (isAlly) {

	}
}

function abilityDescHandler ( agent ) {
	let key = agent.parameters.Champion;
	if (agent.parameters.Ability === 'Passive') {
		return fetchChampPassive( key )
			.then(passive => passiveDescResponses(agent, passive));
	}
	let idx = 0;
	switch (agent.parameters.Ability) {
	case 'Q':
		break;
	case 'W':
		idx = 1;
		break;
	case 'E':
		idx = 2;
		break;
	case 'R':
		idx = 3;
		break;
	default:
		return Promise.reject(new Error("invalid Ability parameter"));
	}
	return fetchChampAbility( key, idx )
		.then(ability => abilityDescResponses(agent, ability));
}

function retrieveDb( ref ) {
	return db.ref(ref)
		.once('value')
		.then(snapshot => snapshot.val());
}

function passiveDescResponses( agent, passive ) {
	agent.add( `${ passive.name }: ${ passive.sanitizedDescription }` );
	agent.add( new Card({
		title : passive.name,
		text : passive.sanitizedDescription,
		imageUrl : ddragon + '/img/passive/' + passive.image.full
	}));
}

function abilityDescResponses( agent, ability ) {
	agent.add( `${ ability.name }: ${ ability.sanitizedDescription }` );
	agent.add( new Card({
		title : ability.name,
		text : ability.sanitizedDescription,
		imageUrl : ddragon + '/img/spell/' + ability.image.full
	}));
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

function fetchChampTip( key, isAlly=true ) {
	return retrieveDb(`/champs/data/${ key }/${ (isAlly) ? 'ally' : 'enemy' }tips`)
		.then(tips => {
			return {
			Champion : key,
			Tip : tips[ Math.floor( Math.random() * tips.length ) ]
			}
		});
}

/*let dummy_agent = {
	idx: 0,
	add: function(e) {
		this[this.idx] = e;
		this.idx++;
	}
};*/