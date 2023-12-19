/**
 *
 * @param {Date} expiryDate
 * @param {TimestampFormat} format
 */
const displayDateAsTimestamp = (
	expiryDate,
	format = TimestampFormat.Default
) => {
	return `<t:${Math.floor(expiryDate.getTime() / 1000)}${format}>`;
};

/**
 * @enum {string}
 */
const TimestampFormat = {
	/** November 28, 2018 9:01 AM */
	Default: "",
	/** 9:01 AM */
	ShortTime: ":t",
	/** 9:01:00 AM */
	LongTime: ":T",
	/** 11/28/2018 */
	ShortDate: ":d",
	/** November 28, 2018 */
	LongDate: ":D",
	/**November 28, 2018 9:01 AM */
	ShortDateTime: ":f",
	/** Wednesday, November 28, 2018 9:01 AM */
	LongDateTime: ":F",
	/** 3 years ago */
	Relative: ":R",
};

module.exports = { displayDateAsTimestamp, TimestampFormat };
