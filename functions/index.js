'use strict';

const functions = require('firebase-functions');
const { WebhookClient, Card, Suggestion } = require('dialogflow-fulfillment');
const firebase = require('firebase');
const fbConfig = require('./nocommit/prof-ryze-firebase-usercfg.json');
const version = '8.9.1';
const ddragon = `http://ddragon.leagueoflegends.com/cdn/${ version }`;

// constants

const ABILITIES = {
	// Riot's API architecture makes it impossible to treat passives as abilities
	// Passive : -1,
	Q : 0,
	W : 1,
	E : 2,
	R : 3
};

const SPELL_VAR_NAMES = {
	spelldamage : 'Ability Power',
	attackdamage : 'Attack Damage',
	bonusattackdamage : 'Bonus Attack Damage',
	bonushealth : 'Bonus Health'
};

// initialization and driver function

firebase.initializeApp(fbConfig);

let db = firebase.database();

exports.dialogflowFirebaseFulfillment = functions.https.onRequest( ( req, res ) => webHookDriver( req, res ) );

function webHookDriver( req, res ) {
	let agent = new WebhookClient({request: req, response: res});
	let intentMap = new Map();
	intentMap.set('Ability-Desc', abilityDescHandler);
	intentMap.set('Ability-Cooldown', abilityCooldownHandler);
	intentMap.set('Ability-Scaling', abilityScalingHandler);
	intentMap.set('Passive-Desc', passiveDescHandler);
	intentMap.set('Champ-Tip-Ally', a => champTipHandler( a, true ) );
	intentMap.set('Champ-Tip-Enemy', a => champTipHandler( a, false ) );
	agent.handleRequest(intentMap);
}


// Ability-Cooldown

function abilityCooldownHandler( agent ) {
	let key = agent.parameters.Champion;
	let idx = ABILITIES[ agent.parameters.Ability ];
	return fetchChampAbility( key, idx )
		.then( ability => abilityCooldownResponses( agent, ability ) );
}

function abilityCooldownResponses( agent, ability ) {
	// let isUltimate = ABILITIES[ agent.parameters.Ability ] === ABILITIES.R;
	agent.add(
		`${ ability.name } has a cooldown of between ${ ability.cooldown[0] } ` + 
		`seconds at rank 1 to ${ ability.cooldown[ ability.cooldown.length-1 ] }` +
		` seconds at rank ${ ability.cooldown.length }.` +
		`With 45% cooldown reduction, it has a cooldown of ${ (ability.cooldown[0] * 0.55).toFixed(1) } seconds at rank 1` +
		`to ${ (ability.cooldown[ ability.cooldown.length - 1] * 0.55).toFixed(1) } seconds at rank ${ ability.cooldown.length }.`);
	let card = new Card( `${ability.name} Cooldown` );
	let cds = ability.cooldown;
	card.setImage( ddragon + '/img/spell/' + ability.image.full );
	// TODO: migrate to table cards when out of dev preview
	// (https://developers.google.com/actions/assistant/responses#table_card)
	card.setText(
		`0% CDR: ${ cds.join('/') }
		45% CDR: ${ cds.map(x => x * 0.55).join('/') }`
		/*+ (isUltimate) ? 
		`0% CDR with Ultimate Hunter: ${ cds.map(x => (x * 0.85).toFixed(1)).join('/')}
		45% CDR with Ultimate Hunter: ${ cds.map(x => (x * 0.40).toFixed(1)).join('/')}`
		: ''*/
	);
	card.setPlatform(agent.requestSource);
	agent.add(card);
}

// Ability-Scaling
 
function abilityScalingHandler( agent ) {
	let key = agent.parameters.Champion;
	let idx = ABILITIES[ agent.parameters.Ability ];
	return fetchChampAbility( key, idx )
		.then( ability => abilityScalingResponses( agent, ability ) );
}

function abilityScalingResponses( agent, ability ) {
	let card = new Card(`Scaling ${ ability.name }`);
	card.setImage( ability.image.full );
	// Add scaling factors to a set to ensure unique values
	let scales = new Set([]);
	for (let v of ability.vars) {
		if (v.link && Object.keys(SPELL_VAR_NAMES).includes((v.link))) {
			scales.add(SPELL_VAR_NAMES[v.link]);
		}
	}
	// expand set back to array
	scales = [...scales];

	// "Ability Name scales with x."
	// "Ability Name scales with x and y."
	// "Ability Name scales with x, y, and z."
	card.setText(`${ability.name} scales with ${
		scales.slice(0, scales.length - 1).join(', ')
	}${ (scales.length > 1) ?
		' and ' + scales[scales.length -1] :
		scales[0]
	}.`);

	card.setImage( ddragon + '/img/spell/' + ability.image.full);
	card.setPlatform(agent.requestSource);
	agent.add(card);
}

// Champ-Tip-Ally
// Champ-Tip-Enemy

function champTipHandler( agent, isAlly=true ) {
	let key = agent.parameters.Champion;
	let fetchTip = Promise.all([fetchChampTips(key, isAlly), fetchChampImage(key)])
		.then(results => {
			let tips = results[0];
			let image = results[1];
			return {
				Champion : key,
				Tip : tips[ Math.floor( Math.random() * tips.length ) ],
				Image : ddragon + '/img/champion/' + image
			};
		});
	return fetchTip.then( tip => champTipResponses( agent, tip, isAlly ));
}

function fetchChampImage ( key ) {
	return retrieveDb(`/champs/data/${key}/image/full`);
}
function champTipResponses ( agent, tip, isAlly ) {
	let base_card = {
		title : (isAlly) ? `Playing as ${tip.Champion}` : `Playing against ${tip.Champion}`,
		text : tip.Tip,
		imageUrl : tip.Image
	};
	let gcard = new Card(base_card);
	gcard.setPlatform(agent.requestSource);
	agent.add(gcard);
}

// Ability-Desc
// Passive-Desc

function abilityDescHandler ( agent ) {
	let key = agent.parameters.Champion;
	let idx = ABILITIES[ agent.parameters.Ability ];
	return fetchChampAbility( key, idx )
		.then(ability => abilityDescResponses(agent, ability));
}

function passiveDescHandler( agent ) {
	let key = agent.parameters.Champion;
	return fetchChampPassive( key )
		.then(passive => passiveDescResponses(agent, passive));
}

function passiveDescResponses( agent, passive ) {
	agent.add( `${ passive.name }: ${ passive.sanitizedDescription }` );
	let base_card = {
		title : passive.name,
		text : passive.sanitizedDescription,
		imageUrl : ddragon + '/img/passive/' + passive.image.full
	};
	let gcard = new Card(base_card);
	gcard.setPlatform(agent.requestSource);
	agent.add(gcard);
}

function abilityDescResponses( agent, ability ) {
	agent.add( `${ ability.name }: ${ ability.sanitizedDescription }` );
	let base_card = {
		title : ability.name,
		text : ability.sanitizedDescription,
		imageUrl : ddragon + '/img/spell/' + ability.image.full
	};
	let gcard = new Card(base_card);
	gcard.setPlatform(agent.requestSource);
	agent.add(gcard);
}

// DB Fetch

function retrieveDb( ref ) {
	return db.ref(ref)
		.once('value')
		.then(snapshot => snapshot.val());
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

function fetchChampTips( key, isAlly=true ) {
	return retrieveDb(`/champs/data/${ key }/${ (isAlly) ? 'ally' : 'enemy' }tips`);
}

// debug code

/*let dummy_agent = {
	idx: 0,
	parameters : {
		Champion: 'Jax',
		Ability : 'Q'
	},
	requestSource : 'ACTIONS_ON_GOOGLE',
		this[this.idx] = e;
	add: function(e) {
		this.idx++;
	}
};

abilityScalingHandler(dummy_agent)
	.then(() => console.log(dummy_agent))
	.catch(err => console.log(err));*/