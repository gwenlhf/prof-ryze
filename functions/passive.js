'use strict';

const { BasicCard, SimpleResponse, Image } = require('actions-on-google');

module.exports = function ( options ) {
	if (!options.db || typeof options.db.retrieve !== 'function') {
		throw new Error("Database reference required");
	}
	if (!options.ddragon) {
		throw new Error("Data Dragon endpoint required");
	}
	let db = options.db;
	let ddragon = options.ddragon;


	// Passive-Desc

	function passiveDescHandler( conv ) {
		let key = conv.parameters.Champion;
		return fetchChampPassive( key )
			.then(passive => passiveDescResponses(conv, passive));
	}

	// literally the same as abilityDescResponses with one url change. Thanks Riot
	function passiveDescResponses( conv, passive ) {
		conv.ask(new SimpleResponse(`${ passive.name }: ${ passive.sanitizedDescription }`));
		conv.ask(new BasicCard({
			title : passive.name,
			text : passive.sanitizedDescription,
			image : new Image({
				url : ddragon + '/img/passive/' + passive.image.full,
				alt : passive.name
			})
		}));
	}

	// DB Fetch

	function fetchChampPassive( key ) {
		return db.retrieve(`/champs/data/${ key }/passive`);
	}

	// export

	return {
		"Passive-Desc" : passiveDescHandler,
	};
}