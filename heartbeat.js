/**
 * Core API methods for interacting with the Heartbeat database
 *
 * Copyright (c) 2017 Harry Burt <http://www.harryburt.co.uk>.
 * @module heartbeat
 * @license MIT
 */
(function($) {
	/* INTERNAL METHODS */
	var	callback = function ( func, arguments ) {
		if( typeof( func ) === "function" ) {
			arguments = [arguments];
			func.apply( null, arguments );
		}
	},
	api = function( params, success, failure ) {
		$.post( 'api.php', $.param( params ), function ( data ) {
			var str = new Date().toISOString() + ' ' + params.action + ' ';
			if ( data.error !== undefined ) {
				console.log( str + 'failed: ' + data.error );
				callback( failure, data.error );
			} else {
				var ret = ( params.action === 'query' || params.action === 'dashboard' )
					? Object.keys( data[params.action] ).length + ' results found.'
					: JSON.stringify( data[params.action] );
				console.log( str + 'succeeded: ' + ret );
				callback( success, data[params.action] );
			}
		}, 'json' );
	}, id, secret;

	/* PUBLIC METHODS */
	$.initAPI = function( newId, newSecret ) {
		id = newId;
		secret = newSecret;
	};
	$.adjust = function ( params, success, failure ) {
		params.action = 'adjust';
		params.id = id;
		params.secret = secret;
		api( params, success, failure );
	};
	$.create = function ( params, success, failure ) {
		params.action = 'create';
		params.id = id;
		params.secret = secret;
		api( params, success, failure );
	};
	$.dashboard = function ( success, failure ) {
		api( { action: 'dashboard', id: id, secret: secret }, success, failure );
	};
	$.heartbeat = function( success, failure ) {
		api( { action: 'heartbeat', id: id, secret: secret }, success, failure );
	};
	$.query = function( params, success, failure ) {
		params.action = 'query';
		params.id = id;
		params.secret = secret;
		api( params, success, failure );
	};
	$.validate = function ( params, success, failure ) {
		params.action = 'validate';
		params.id = id;
		params.secret = secret;
		api( params, success, failure );
	};
}(jQuery));