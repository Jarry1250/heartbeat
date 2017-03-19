/**
 * Time and date conversion functions
 *
 * Copyright (c) 2017 Harry Burt <http://www.harryburt.co.uk>.
 * @module heartbeat/table
 * @license MIT
 */
(function($) {

	/**
	 * Parse a date string to give the correct number of epoch seconds. A wrapper around the rather too rigid
	 * Date.parse().
	 * @param {string} date A date in the format 20170101...
	 * @returns {number} Seconds since 1 January 1970
	 */
	$.toEpochSeconds = function ( date ) {
		return Date.parse(
			date.substr( 0, 4 ) + '/' + date.substr( 4, 2 ) + '/' + date.substr( 6, 2 ) + date.substr( 8 )
		) / 1000;
	};

	/**
	 * Parse a date string and return a new Date object
	 *
	 * @param {string} date A date in the format 20170101...
	 * @returns {Date}
	 */
	$.toDate = function ( date ) {
		return new Date( $.toEpochSeconds( date ) * 1000 );
	};

	/**
	 * Takes a date object an return a string formatted as (e.g.) 'Mon 1 Jan'
	 * @param {string} date
	 * @returns {string}
	 */
	$.toPrettyName = function ( date ) {
		var options = { weekday: "short", day: "numeric", month: "short" };
		return $.toDate( date ).toLocaleDateString( 'en-GB', options );
	};

	/**
	 * Converts a large number of seconds into the format 'HH:SS'.
	 *
	 * @param {number} seconds A number of seconds since the beginning of either the day or the epoch
	 * @returns {string} A string in the format 'HH:SS'
	 */
	$.secondsToHours = function ( seconds ) {
		var d = new Date( seconds * 1000 ),
			hours = d.getHours(),
			mins = d.getMinutes();
		if( d.getYear() == 70 ) hours += ( ( d.getDate() - 1 ) * 24 );
		if ( hours < 10 ) hours = '0' + hours;
		if ( mins < 10 ) mins = '0' + mins;
		return hours + ':' + mins;
	};

	/**
	 * Converts a string in the format 'HH:SS' into the number of seconds that amounts to
	 *
	 * @param {string} hours A string in the format HH:SS
	 * @returns {number}
	 */
	$.hoursToSeconds = function ( hours ) {
		var bits = hours.toString().split( ':' ),
			minutes = parseInt( bits[0] ) * 60;
		minutes = ( bits.length > 1 ) ? minutes + parseInt( bits[1] ) : minutes;
		return minutes * 60;
	};

	/**
	 * Returns the 'YYYYMM' representation of a given date
	 *
	 * @param {Date} date
	 * @returns {string}
	 */
	$.dateToMonth = function ( date ) {
		var month = ( date.getMonth() ) + 1; // zero-indexed!
		return date.getFullYear().toString() + ( ( month < 10 ) ? '0' + month : month );
	};

	/**
	 * Takes a month in the format 'YYYYMM' and returns the equivalent but for a month earlier
	 *
	 * @param {string} month
	 * @returns {string}
	 */
	$.getPreviousMonth = function ( month ) {
		var newDate = $.toDate( month + '01' );
		newDate.setMonth( newDate.getMonth() - 1 ); // Guaranteed to work since all months have a day 01
		return $.dateToMonth( newDate );
	};

	/**
	 * Takes a month in the format 'YYYYMM' and returns the equivalent but for a month later
	 * @param {string} month
	 * @returns {string}
	 */
	$.getNextMonth = function ( month ) {
		var newDate = $.toDate( month + '01' );
		newDate.setMonth( newDate.getMonth() + 1 ); // Guaranteed to work since all months have a day 01
		return $.dateToMonth( newDate );
	};

	/**
	 * Returns a Date which represents the Monday immediately preceding the Date supplied. If the Date supplied *is*
	 * a Monday, there is no change.
	 *
	 * @param {Date} date
	 * @returns {Date}
	 */
	$.getPreviousMonday = function ( date ) {
		date.setHours( 11 ); // Avoid auto-DST issues
		var diff = date.getDate() - date.getDay() + 1;
		if( date.getDay() == 0 ) diff -= 7;
		return new Date( date.setDate( diff ) );
	};

	/**
	 * Returns a Date which represents the Monday immediately preceding the Date supplied. If the Date supplied *is*
	 * a Monday, there is no change.
	 * @param {Date} date
	 * @returns {Date}
	 */
	$.getNextSunday = function ( date ) {
		date = $.getPreviousMonday( date );
		return new Date( date.setDate( date.getDate() + 6 ) );
	};
}(jQuery));