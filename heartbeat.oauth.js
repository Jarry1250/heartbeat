/**
 * A simple OAuth-based authentication system suitable for use with Heartbeat
 *
 * Copyright (c) 2017 Harry Burt <http://www.harryburt.co.uk>.
 * @module heartbeat/oauth
 * @license MIT
 */
(function($) {
	var clientId, redirectUrl, params = {};

	/**
	 * Set a series of global variables, using both the supplied parameters and document.location
	 * @param {string} newClientId
	 * @param {string} newRedirectUrl
	 */
	$.initOauth = function( newClientId, newRedirectUrl ) {
		clientId = newClientId;
		redirectUrl = newRedirectUrl;
		var decode = function ( str ) {	return decodeURIComponent( str.replace( /\+/g, ' ' ) ); },
			e, re = /([^&=]+)=?([^&]*)/g;
		while ( e = re.exec( document.location.hash.substr( 1 ) ) ) {
			params[decode( e[1] )] = decode( e[2] );
		}
	};

	/**
	 * Check whether this page is a 'redirect' page (i.e. the page Google has returned the user to)
	 * @returns {boolean}
	 */
	$.isRedirectUrl = function() {
		return ( params.state === 'login' );
	};

	/**
	 * Redirect the user to the authentication screen on accounts.google.com
	 */
	$.doRedirect = function () {
		var oAuthParams = {
			scope: 'email',
			state: 'login',
			redirect_uri: redirectUrl,
			response_type: 'token',
			client_id: clientId
		};
		document.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + $.param( oAuthParams );
	};

	/**
	 * Verify the supplied credentials
	 * @param {RegExp} regex The regular express the user's email must match.
	 * @param {function} success
	 */
	$.verify = function ( regex, success ) {
		$.getJSON( 'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + params.access_token, function ( data ) {
			if ( data.error !== undefined ) {
				console.log( 'OAUTH ERROR: ' + data.error );
				return;
			} else if ( data.aud !== clientId ) {
				console.log( 'OAUTH ERROR: invalid audience' );
				return;
			} else if ( data.email_verified !== 'true' ) {
				console.log( 'OAUTH ERROR: email not verified' );
				return;
			} else if ( data.email.match( regex ) === null ) {
				console.log( 'OAUTH ERROR: bad email' );
				return;
			}
			console.log( 'Authenticated as ' + data.sub );
			success( data.sub );
		} );
	};
}(jQuery));