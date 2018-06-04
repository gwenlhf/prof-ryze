'use strict';

const { dialogflow, BasicCard, SimpleResponse, Image } = require('actions-on-google');
const firebase = require('firebase');
const fbConfig = require('./nocommit/prof-ryze-firebase-usercfg.json');
const version = '8.9.1';
const ddragon = `http://ddragon.leagueoflegends.com/cdn/${ version }`;

firebase.initializeApp(fbConfig);

let db = firebase.database();

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

// Ability-Cost
function abilityCostHandler( conv ) {
	let key = conv.parameters.Champion;
	let idx = ABILITIES[ conv.parameters.Ability ];
	return fetchChampAbility( key, idx )
		.then( ability => abilityCostResponses( conv, ability )); 
}

function abilityCostResponses( conv, ability ) {
	let costs = ability.cost;
	let ttsText = "";
	let base_card  = {};

	// Riot's scheme for costType is absolute unmanaged insanity
	if (ability.costType === "No Cost") {
		ttsText = `${ ability.name } has no cost.`;
		base_card = {
			title : `${ability.name} Cost`,
			image : new Image({
				url : ddragon + '/img/spell/' + ability.image.full,
				alt : ability.name
			}),
			text : text
		};
	// space in " Mana" is not a typo
	} else if (ability.costType !== " Mana") {
		ttsText = `Sorry, abilities that don't use Mana are not yet supported.`;
		base_card = {
			title : `${ability.name} Cost`,
			image : new Image({
				url : ddragon + '/img/spell/' + ability.image.full,
				alt : ability.name
			}),
			text : ttsText
		};
	} else {
		ttsText = `${ ability.name } has a mana cost of ${ ability.cost[0] }` + 
				` at rank 1 and ${ ability.cost[ ability.cost.length-1 ] }` +
				` at rank ${ ability.cost.length }.`
		base_card = {
			title : `${ability.name} Cost`,
			image : new Image({
				url : ddragon + '/img/spell/' + ability.image.full,
				alt : ability.name
			}),
			text : `Cost: ${ costs.join('/') }`
		};
	}
	conv.ask( new SimpleResponse(ttsText));
	conv.ask( new BasicCard(base_card));
}

// Ability-Cooldown

function abilityCooldownHandler( conv ) {
	let key = conv.parameters.Champion;
	let idx = ABILITIES[ conv.parameters.Ability ];
	return fetchChampAbility( key, idx )
		.then( ability => abilityCooldownResponses( conv, ability ) );
}

// TODO: migrate to table cards when out of dev preview
// TODO: fix ultimate hunter text
// (https://developers.google.com/actions/assistant/responses#table_card)
function abilityCooldownResponses( conv, ability ) {
	let fmtCDR = ( x, cdr=0 ) => Math.floor(x * (1 - cdr));
	let cds = ability.cooldown;
	
	let ttsText = `${ ability.name } has a cooldown of ${ ability.cooldown[0] }` + 
			` seconds at rank 1 and ${ ability.cooldown[ ability.cooldown.length-1 ] }` +
			` seconds at rank ${ ability.cooldown.length }.` +
			` With 45% cooldown reduction, it has a cooldown of ${ fmtCDR(ability.cooldown[0], 0.45) } seconds at rank 1` +
			` and ${ fmtCDR(ability.cooldown[ ability.cooldown.length - 1 ], 0.45) } seconds at rank ${ ability.cooldown.length }.`;
	
	let base_card = {
		title : `${ability.name} Cooldown`,
		image : new Image({
			url : ddragon + '/img/spell/' + ability.image.full,
			alt : ability.name
		}),
		text : `0% CDR: ${ cds.join('/') }  \n45% CDR: ${ cds.map(x => fmtCDR(x, 0.45)).join('/') }`
	};
	conv.ask( new SimpleResponse(ttsText));
	conv.ask( new BasicCard(base_card));
}

// Ability-Scaling
 
function abilityScalingHandler( conv ) {
	let key = conv.parameters.Champion;
	let idx = ABILITIES[ conv.parameters.Ability ];
	return fetchChampAbility( key, idx )
		.then( ability => abilityScalingResponses( conv, ability ) );
}

function abilityScalingResponses( conv, ability ) {
	let base_card = {
		title : `Scaling ${ ability.name }`,
		image : new Image({
			url : ddragon + '/img/spell/' + ability.image.full,
			alt : ability.name
		})
	};
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
	// "Ability Name scales with x, y and z." (Can't swing the Oxford comma without another ternary, probably)
	base_card.text = `${ability.name} scales with ${
		scales.slice(0, scales.length - 1).join(', ')
	}${ (scales.length > 1) ?
		' and ' + scales[scales.length -1] :
		scales[0]
	}.`;

	conv.ask(new SimpleResponse(base_card.text));
	conv.ask(new BasicCard(base_card));
}

// Champ-Tip-Ally
// Champ-Tip-Enemy

function champTipHandler( conv, isAlly=true ) {
	let key = conv.parameters.Champion;
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
	return fetchTip.then( tip => champTipResponses( conv, tip, isAlly ));
}

function fetchChampImage ( key ) {
	return retrieveDb(`/champs/data/${key}/image/full`);
}
function champTipResponses ( conv, tip, isAlly ) {
	let base_card = {
		title : (isAlly) ? `Playing as ${tip.Champion}` : `Playing against ${tip.Champion}`,
		text : tip.Tip,
		image : new Image({
			url : tip.Image,
			alt : tip.Champion
		})
	};
	conv.ask(new SimpleResponse(base_card.text));
	conv.ask(new BasicCard(base_card));
}

// Ability-Desc
// Passive-Desc

function abilityDescHandler ( conv ) {
	let key = conv.parameters.Champion;
	let idx = ABILITIES[ conv.parameters.Ability ];
	return fetchChampAbility( key, idx )
		.then(ability => abilityDescResponses(conv, ability));
}

function passiveDescHandler( conv ) {
	let key = conv.parameters.Champion;
	return fetchChampPassive( key )
		.then(passive => passiveDescResponses(conv, passive));
}

// literally the same as abilityDescResponses with one url change. Thanks Riot
function passiveDescResponses( conv, passive ) {
	conv.ask(new SimpleResponse(`${ ability.name }: ${ ability.sanitizedDescription }`));
	conv.ask(new BasicCard({
		title : ability.name,
		text : ability.sanitizedDescription,
		image : new Image({
			url : ddragon + '/img/passive/' + ability.image.full,
			alt : ability.name
		})
	}));
}

function abilityDescResponses( conv, ability ) {
	conv.ask(new SimpleResponse(`${ ability.name }: ${ ability.sanitizedDescription }`));
	conv.ask(new BasicCard({
		title : ability.name,
		text : ability.sanitizedDescription,
		image : new Image({
			url : ddragon + '/img/spell/' + ability.image.full,
			alt : ability.name
		})
	}));
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

// export

exports.ryze = {
	"Ability-Desc" : abilityDescHandler,
	"Ability-Cooldown" : abilityCooldownHandler,
	"Ability-Scaling" : abilityScalingHandler,
	"Passive-Desc" : passiveDescHandler,
	"Ability-Cost" : abilityCostHandler,
	"Champ-Tip-Enemy" : conv => champTipHandler(conv, true),
	"Champ-Tip-Ally" : conv => champTipHandler(conv, false)
};


// debug code

/*let dummy_conv = {
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