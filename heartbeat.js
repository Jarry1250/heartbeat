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
	};

	/* PUBLIC METHODS */
	$.adjust = function ( params, success, failure ) {
		params.action = 'adjust';
		api( params, success, failure );
	};
	$.create = function ( params, success, failure ) {
		params.action = 'create';
		api( params, success, failure );
	};
	$.dashboard = function ( success, failure ) {
		api( { action: 'dashboard' }, success, failure );
	};
	$.heartbeat = function( params, success, failure ) {
		params.action = 'heartbeat';
		api( params, success, failure );
	};
	$.query = function( params, success, failure ) {
		params.action = 'query';
		api( params, success, failure );
	};
	$.validate = function ( params, success, failure ) {
		params.action = 'validate';
		api( params, success, failure );
	};
}(jQuery));