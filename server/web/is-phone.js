var parser = require('useragent');

var isPhone = function(userAgentString) {
	var agent = parser.parse(userAgentString);
	return agent.device.family === 'iPhone' || agent.os.family === 'Android';
};

module.exports = isPhone;