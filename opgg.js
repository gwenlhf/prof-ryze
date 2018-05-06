const rq = require('request-promise-native');
const cheerio = require('cheerio');

const USER_AGENT_MOBILE = 'Mozilla/5.0 (Linux; U; Android 2.3; en-us) AppleWebKit/999+ (KHTML, like Gecko) Safari/999.9';
const USER_AGENT_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/5'

const DEFAULT_REGION = 'na';
const DEFAULT_HEADERS = {
	'User-Agent' : USER_AGENT_DESKTOP,
	'DNT' : 1
};

function fetchOPGG( opts ) {
	if (!opts.endpoint)
		return Promise.reject("must specify endpoint");
	if (!opts.region)
		opts.region = DEFAULT_REGION;
	if (opts.referer)
		opts.headers = ajaxHeaders(`http://${ opts.region }.op.gg${ opts.referer }`, opts.useMobile);
	if (!opts.headers)
		opts.headers = DEFAULT_HEADERS;
	let uri = `http://${ opts.region }.op.gg${ opts.endpoint }`;
	let rq_opts = {
		uri : uri,
		headers : opts.headers,
		transform : (body) => cheerio.load(body)
	};
	return rq(rq_opts);
}

function fetchChampBuild( name, role ) {
	if (!role) {
		return fetchDefaultRole(name)
			.then(role => fetchChampBuild(name, role));
	}
	let refer = `/champion/${ name.toLowerCase() }/statistics/${ role.toLowerCase() }`;
	let opts = {
		endpoint : `${ refer }/item?`,
		referer : refer,
		useMobile : true
	}
	return fetchOPGG(opts)
		.then($ => parseChampBuild($));
}

function fetchBestBans( role = 'all') {
	let opts = {
		endpoint : '/champion/ajax/statistics/trendChampionList/type=banratio&',
		referer : '/champion/statistics'
	}
	return fetchOPGG(opts)
		.then($ => parseBestBans($, role));
}


function fetchChampRunes ( name, role ) {
	if (!role) {
		return fetchDefaultRole(name)
			.then(role => fetchChampRunes(name, role));
	}
	let refer = `/champion/${ name.toLowerCase() }/statistics/${ role.toLowerCase() }`;
	let opts = {
		endpoint : `${ refer }/rune?`,
		referer : refer
	};
	return fetchOPGG(opts)
		.then($ => parseChampRunes($));
}

function fetchBestChamps( role ) {
	let opts = {
		endpoint : '/champion/statistics'
	};
	return fetchOPGG(opts)
		.then($ => parseBestChamps($, role));
}

// awful function to find a default role, if none provided
// (ping the server, wait for a redirect, then take the string out of the headers)
function fetchDefaultRole( name, region = DEFAULT_REGION ) {
	let url = `http://${ region }.op.gg/champion/${ name.toLowerCase() }/statistics`;
	let opts = {
		uri : url,
		headers : {
			'User-Agent' : USER_AGENT_MOBILE,
			'DNT' : 1
		},
		simple: false,
		followRedirect : false,
		resolveWithFullResponse: true
	}
	return rq(opts)
		.then(response => {
			let loc = response.headers.location;
			let role = loc.split('/');
			role = role[role.length - 1];
			return role;
		});
}


function parseBestChamps( $ , role = 'top') {
	let champs = [];
	$(`.champion-trend-tier-${ role.toUpperCase() } .champion-index-table__cell--champion .champion-index-table__name`).each((i, e) => {
		if  (i == 3) return false;
		champs.push($(e).text());
	});
	return champs;
}

function parseBestBans( $ , role ) {
	let champs = [];
	$(`.champion-trend-banratio-${ role.toUpperCase() } .champion-index-table__cell--champion .champion-index-table__name`).each((i, e) => {
		if  (i == 3) return false;
		champs.push($(e).text());
	});
	return champs;
}

function parseChampBuild( $ ) {
	let items = [];
	$('tbody tr').first().find('img.tip').each((i, e) => {
		items.push(e.attribs.alt);
	});
	return items;
}

function parseChampRunes ( $ ) {
	let runes = [];
	$('.perk-page-wrap').first().find('.perk-page__item--active img')
		.each((i, e) => {
			runes.push(e.attribs.alt);
		});
	return runes;
}

function ajaxHeaders( referer, useMobile = true ) {
	return {
		'User-Agent' : (useMobile) ? USER_AGENT_MOBILE : USER_AGENT_DESKTOP,
		'Referer' : referer,
		'X-Requested-With' : 'XMLHttpRequest',
		'DNT': 1
	}
}

module.exports = {
	fetchChampBuild:fetchChampBuild,
	fetchBestBans:fetchBestBans,
	fetchChampRunes:fetchChampRunes,
	fetchBestChamps:fetchBestChamps,
};