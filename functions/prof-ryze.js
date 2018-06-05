'use strict';

const { BasicCard, SimpleResponse, Image } = require('actions-on-google');

const version = '8.9.1';
const ddragon = `http://ddragon.leagueoflegends.com/cdn/${ version }`;

const passive = require('./passive.js');
const ability = require('./ability.js');
const champ = require('./champ.js');

module.exports = function ( options ) {
	if (!options.db) {
		throw new Error("Database reference required");
	}
	let db = options.db;

	let handlers = {};

	let opts = {
		db: db,
		ddragon: ddragon
	};

	Object.assign(handlers, passive(opts), ability(opts), champ(opts));

	return handlers;
}
