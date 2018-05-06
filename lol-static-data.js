const rq = require('request-promise-native');
const cfg = require('config');

const API_KEY = cfg.get('RIOT_API_KEY');

const DEFAULT_REGION = 'na1';
const DEFAULT_LOCALE = 'en_US';

function fetchRiotApi( opts ) {
	if (!opts.endpoint)
		return Promise.reject("must specify endpoint");
	if (!opts.region)
		opts.region = DEFAULT_REGION;
	if (!opts.locale)
		opts.locale = DEFAULT_LOCALE;
	if (!opts.tags)
		opts.tags = [];

	let uri = `https://${ opts.region }.api.riotgames.com${ opts.endpoint }?locale=${ opts.locale }${ (opts.tags.length > 0) ? '&tags=' : '' }${ opts.tags.join('&tags=') }`;

	let rq_opts = {
		uri : uri,
		headers : {
			'X-Riot-Token' : API_KEY
		},
		transform: (body) => JSON.parse(body)
	};

	return rq(rq_opts);
}

function fetchAllChampsStatic( tags = [] ) {
	opts = {
		endpoint : '/lol/static-data/v3/champions',
		tags : tags
	};
	return fetchRiotApi(opts);
}

function fetchChampStatic( id, tags = [] ) {
	opts = {
		endpoint : `/lol/static-data/v3/champions/${ id }`,
		tags : tags
	};
	return fetchRiotApi(opts);
}

function fetchChampPassive( id ) {
	return fetchChampStatic(id, ['passive'])
		.then(data => data.passive);
}

function fetchChampAbility( id, idx ) {
	return fetchChampStatic(id, ['spells'])
		.then(data => data.spells[idx]);
}


fetchChampPassive(12)
	.then(passive => console.log(passive))
	.catch(err => console.log(err));