'use strict';

const { BasicCard, SimpleResponse, Image } = require('actions-on-google');

module.exports = function (options) {
	if (!options.db || typeof options.db.retrieve !== 'function') {
		throw new Error("Database reference required");
	}
	if (!options.ddragon) {
		throw new Error("Data Dragon endpoint required");
	}
	let db = options.db;
	let ddragon = options.ddragon;


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

	// DB Fetch

	function fetchChampImage ( key ) {
		return retrieveDb(`/champs/data/${key}/image/full`);
	}
	function fetchChampTips( key, isAlly=true ) {
		return db.retrieve(`/champs/data/${ key }/${ (isAlly) ? 'ally' : 'enemy' }tips`);
	}

	return {
		"Champ-Tip-Enemy" : conv => champTipHandler(conv, true),
		"Champ-Tip-Ally" : conv => champTipHandler(conv, false)
	};
}
