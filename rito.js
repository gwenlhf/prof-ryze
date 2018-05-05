const rq = require('request-promise-native');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'http://na.op.gg';
const USER_AGENT_MOBILE = 'Mozilla/5.0 (Linux; U; Android 2.3; en-us) AppleWebKit/999+ (KHTML, like Gecko) Safari/999.9';
const USER_AGENT_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/5'

const DEFAULT_HEADERS = {
	'User-Agent' : USER_AGENT_DESKTOP,
	'DNT' : 1
};

function fetchChampBuild( name, role ) {
	if (!role) {
		return fetchDefaultRole(name)
			.then(role => fetchChampBuild(name, role));
	}
	let champurl = `${ BASE_URL }/champion/${ name.toLowerCase() }/statistics/${ role.toLowerCase() }`;
	let opts = {
		uri : champurl + '/item?',
		headers : ajaxHeaders(champurl),
		transform : (body) => cheerio.load(body)
	};
	return rq(opts)
		.then($ => parseChampBuild($));
}

function fetchBestBans( role = 'all') {
	let url = `${ BASE_URL }/champion/ajax/statistics/trendChampionList/type=banratio&`;
	let opts = {
		uri : url,
		headers : ajaxHeaders(`${ BASE_URL }/champion/statistics`, false),
		transform : (body) => cheerio.load(body)
	};
	return rq(opts)
		.then($ => parseBestBans($, role));
}

function fetchBestChamps( role ) {
	let url = `${ BASE_URL }/champion/statistics`;
	let opts = {
		uri : url,
		headers : DEFAULT_HEADERS,
		transform: (body) => cheerio.load(body)
	};
	return rq(opts)
		.then($ => parseBestChamps($, role));
}

function parseBestChamps( $ , role ) {
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

// awful function to find a default role, if none provided
// (ping the server, wait for a redirect, then take the string out of the headers)
function fetchDefaultRole( name ) {
	let url = `${ BASE_URL }/champion/${ name.toLowerCase() }/statistics`;
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

function fetchChampRunes ( name, role ) {
	if (!role) {
		return fetchDefaultRole(name)
			.then(role => fetchChampRunes(name, role));
	}
	let champurl = `${BASE_URL}/champion/${ name.toLowerCase() }/statistics/${ role.toLowerCase() }`;
	let opts = {
		uri : champurl + '/rune?',
		headers : ajaxHeaders(champurl, false),
		transform : (body) => cheerio.load(body)
	};
	return rq(opts)
		.then($ => parseChampRunes($));
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

fetchBestBans('mid')
	.then(bans => console.log(bans))
	.catch(err => console.log(err));